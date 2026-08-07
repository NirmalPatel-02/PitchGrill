from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.schemas.session import SessionCreate, SessionResponse, SessionListItem
from app.repositories.session_repo import SessionRepository

router = APIRouter(prefix="/sessions", tags=["Pitch Sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(data: SessionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return SessionRepository.create(db, user_id=current_user.user_id, data=data)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    session = SessionRepository.get_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your session.")
    return session


@router.get("", response_model=list[SessionListItem])
def list_sessions(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return SessionRepository.get_all_for_user(db, user_id=current_user.user_id)