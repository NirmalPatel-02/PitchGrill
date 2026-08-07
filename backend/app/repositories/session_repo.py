from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.pitch_sessions import PitchSession

class SessionRepository:

    @staticmethod
    def create(db: Session, user_id: str, data) -> PitchSession:
        session = PitchSession(
            user_id=user_id,
            startup_name=data.startup_name,
            sector=data.sector,
            stage=data.stage,
            funding_ask=data.funding_ask,
            equity_offered=data.equity_offered,
            pitch_text=data.pitch_text,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_by_id(db: Session, session_id: str) -> PitchSession | None:
        return db.query(PitchSession).filter(PitchSession.session_id == session_id).first()

    @staticmethod
    def get_all_for_user(db: Session, user_id: str) -> list[PitchSession]:
        return (
            db.query(PitchSession)
            .filter(PitchSession.user_id == user_id)
            .order_by(desc(PitchSession.created_at))
            .all()
        )