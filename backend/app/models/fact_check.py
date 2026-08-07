import uuid
from sqlalchemy import Column, String, Text, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class FactCheck(Base):
    __tablename__ = "fact_checks"

    check_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    turn_id = Column(String(36), ForeignKey("turns.turn_id", ondelete="CASCADE"), nullable=False)
    claim_text = Column(Text, nullable=False)
    verdict = Column(Enum("confirmed", "refuted", "unverifiable", name="fact_verdict"), nullable=False)
    search_query = Column(String(255), nullable=False)
    source_url = Column(String(512), nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    turn = relationship("Turn", back_populates="fact_checks")