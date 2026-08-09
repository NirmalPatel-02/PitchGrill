import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from app.core.database import Base

class OTPCode(Base):
    __tablename__ = "otp_codes"

    otp_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())