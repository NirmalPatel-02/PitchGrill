import uuid
from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class SessionReport(Base):
    __tablename__ = "session_reports"

    report_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("pitch_sessions.session_id", ondelete="CASCADE"), unique=True, nullable=False)
    panel_verdict = Column(Text, nullable=False)
    avg_specificity = Column(Numeric(3, 2), nullable=False)
    avg_evidence = Column(Numeric(3, 2), nullable=False)
    avg_clarity = Column(Numeric(3, 2), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("PitchSession", back_populates="report")