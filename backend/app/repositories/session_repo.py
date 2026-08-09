from sqlalchemy.orm import Session
from app.models.pitch_sessions import PitchSession
from app.models.session_report import SessionReport
from app.models.turn import Turn
from app.schemas.session import SessionCreate

class SessionRepository:

    @staticmethod
    def create(db: Session, user_id: str, data: SessionCreate) -> PitchSession:
        session = PitchSession(
            user_id=user_id,
            startup_name=data.startup_name,
            sector=data.sector,
            stage=data.stage,
            funding_ask=data.funding_ask,
            equity_offered=data.equity_offered,
            pitch_text=data.pitch_text,
            max_rounds=data.max_rounds,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_by_id(db: Session, session_id: str) -> PitchSession | None:
        return db.query(PitchSession).filter(PitchSession.session_id == session_id).first()

    @staticmethod
    def get_all_for_user(db: Session, user_id: str):
        return db.query(PitchSession).filter(PitchSession.user_id == user_id).order_by(PitchSession.created_at.desc()).all()

    @staticmethod
    def add_turn(db: Session, session_id: str, round_number: int, persona: str, question_text: str) -> Turn:
        turn = Turn(
            session_id=session_id,
            round_number=round_number,
            persona=persona,
            question_text=question_text,
        )
        db.add(turn)
        db.commit()
        db.refresh(turn)
        return turn

    @staticmethod
    def update_turn_with_answer(db: Session, session_id: str, round_number: int, answer: str, eval_scores: dict | None, fact_check: dict | None):
        turn = db.query(Turn).filter(Turn.session_id == session_id, Turn.round_number == round_number).first()
        if turn:
            turn.human_answer = answer
            turn.eval_scores = eval_scores
            turn.fact_check = fact_check
            db.commit()

    @staticmethod
    def save_final_report(db: Session, session_id: str, report_data: dict):
        report = SessionReport(
            session_id=session_id,
            panel_verdict=report_data["panel_verdict"],
            would_invest=report_data["would_invest"],
            avg_specificity=report_data["avg_specificity"],
            avg_evidence=report_data["avg_evidence"],
            avg_clarity=report_data["avg_clarity"],
            strengths=report_data["strengths"],
            concerns=report_data["concerns"],
            fact_check_log=report_data["fact_check_log"],
        )
        session = db.query(PitchSession).filter(PitchSession.session_id == session_id).first()
        if session:
            session.status = "completed"
        db.add(report)
        db.commit()

    @staticmethod
    def count_for_user(db: Session, user_id: str) -> int:
        return db.query(PitchSession).filter(PitchSession.user_id == user_id).count()