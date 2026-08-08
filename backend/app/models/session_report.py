from sqlalchemy import Column, String, ForeignKey, JSON, Text, DateTime, func , Float
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class SessionReport(Base):
    __tablename__ = "session_reports"

    report_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("pitch_sessions.session_id", ondelete="CASCADE"), nullable=False, unique=True)
    panel_verdict = Column(Text, nullable=False)
    would_invest = Column(String(20), nullable=False)
    avg_specificity = Column(Float, nullable=False)
    avg_evidence = Column(Float, nullable=False)
    avg_clarity = Column(Float, nullable=False)
    strengths = Column(JSON, nullable=False)
    concerns = Column(JSON, nullable=False)
    fact_check_log = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("PitchSession", back_populates="report")