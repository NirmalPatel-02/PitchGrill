from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from langgraph.types import Command

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.schemas.session import SessionCreate, SessionResponse, SessionListItem, AnswerSubmit
from app.repositories.session_repo import SessionRepository
from app.agents.graph import graph, PitchAgentState
from app.core.config import settings

router = APIRouter(prefix="/sessions", tags=["Pitch Sessions"])

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(data: SessionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    
    if SessionRepository.count_for_user(db, current_user.user_id) >= settings.MAX_SESSIONS_PER_USER:
        raise HTTPException(status_code=403, detail=f"Limit of {settings.MAX_SESSIONS_PER_USER} sessions per account reached.")

    db_session = SessionRepository.create(db, user_id=current_user.user_id, data=data)

    initial_state: PitchAgentState = {
        "session_id": db_session.session_id,
        "startup_name": db_session.startup_name,
        "sector": db_session.sector,
        "stage": db_session.stage,
        "funding_ask": int(db_session.funding_ask),
        "equity_offered": int(db_session.equity_offered) if db_session.equity_offered else 0,
        "pitch_text": db_session.pitch_text,
        "round_number": 0,
        "max_rounds": db_session.max_rounds,
        "current_persona": None,
        "question_text": None,
        "human_answer": None,
        "guardrail_blocked": False,
        "guardrail_reason": None,
        "claim_found": False,
        "claim_text": None,
        "search_query": None,
        "fact_check_result": None,
        "eval_scores": None,
        "transcript": [],
        "final_report": None,
    }

    config = {"configurable": {"thread_id": db_session.session_id}}

    graph_output = graph.invoke(initial_state, config=config)

    if "__interrupt__" in graph_output:
        interrupt_info = graph_output["__interrupt__"][0].value
        SessionRepository.add_turn(
            db=db,
            session_id=db_session.session_id,
            round_number=0,
            persona=interrupt_info["persona"],
            question_text=interrupt_info["question"],
        )

    db.refresh(db_session)
    return db_session


@router.post("/{session_id}/answer", response_model=SessionResponse)
def submit_answer(
    session_id: str,
    payload: AnswerSubmit,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    session = SessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this session.")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This pitch session is already completed.")

    config = {"configurable": {"thread_id": session_id}}

    graph_output = graph.invoke(Command(resume=payload.answer), config=config)

    if "transcript" in graph_output and len(graph_output["transcript"]) > 0:
        latest_entry = graph_output["transcript"][-1]
        SessionRepository.update_turn_with_answer(
            db=db,
            session_id=session_id,
            round_number=session.current_round,
            answer=payload.answer,
            eval_scores=latest_entry.get("eval_scores"),
            fact_check=latest_entry.get("fact_check"),
        )
        session.current_round += 1
        db.commit()

    if "__interrupt__" in graph_output:
        interrupt_info = graph_output["__interrupt__"][0].value
        SessionRepository.add_turn(
            db=db,
            session_id=session_id,
            round_number=session.current_round,
            persona=interrupt_info["persona"],
            question_text=interrupt_info["question"],
        )

    elif "final_report" in graph_output and graph_output["final_report"]:
        SessionRepository.save_final_report(
            db=db,
            session_id=session_id,
            report_data=graph_output["final_report"],
        )

    db.refresh(session)
    return session

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    session = SessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    return session


@router.get("", response_model=list[SessionListItem])
def list_sessions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return SessionRepository.get_all_for_user(db, user_id=current_user.user_id)