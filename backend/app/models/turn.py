import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, JSON, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Turn(Base):
    __tablename__ = "turns"

    turn_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("pitch_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    round_number = Column(Integer, nullable=False)
    persona = Column(String(50), nullable=False)
    question_text = Column(Text, nullable=False)
    human_answer = Column(Text, nullable=True)
    eval_scores = Column(JSON, nullable=True)
    fact_check = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("PitchSession", back_populates="turns")