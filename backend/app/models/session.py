import uuid
from sqlalchemy import Column, String, Numeric, Integer, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class PitchSession(Base):
    __tablename__ = "pitch_sessions"

    session_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    startup_name = Column(String(150), nullable=False)
    sector = Column(String(50), nullable=False)
    stage = Column(String(50), nullable=False)
    funding_ask = Column(Numeric(12, 2), nullable=False)
    equity_offered = Column(Numeric(5, 2), nullable=True)
    pitch_text = Column(String(5000), nullable=False)
    current_round = Column(Integer, default=0)
    status = Column(Enum("active", "completed", name="session_status"), default="active")
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="sessions")
    turns = relationship("Turn", back_populates="session", cascade="all, delete-orphan")