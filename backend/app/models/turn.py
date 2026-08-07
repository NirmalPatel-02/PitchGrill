import uuid
from sqlalchemy import Column, String, Text, Integer, Enum, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Turn(Base):
    __tablename__ = "turns"

    turn_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("pitch_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    round_number = Column(Integer, nullable=False)
    persona = Column(Enum("Skeptic", "Growth", "Product", name="persona_type"), nullable=False)
    question_text = Column(Text, nullable=False)
    human_answer = Column(Text, nullable=True)
    specificity_score = Column(Integer, nullable=True)
    evidence_score = Column(Integer, nullable=True)
    clarity_score = Column(Integer, nullable=True)
    red_flags = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("PitchSession", back_populates="turns")
    fact_checks = relationship("FactCheck", back_populates="turn", cascade="all, delete-orphan")