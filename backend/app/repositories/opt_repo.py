import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.opt import OTPCode
from app.core.config import settings


class OTPRepository:

    @staticmethod
    def create(db: Session, user_id: str) -> str:

        db.query(OTPCode).filter(OTPCode.user_id == user_id).delete()

        code = f"{random.randint(0, 999999):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        otp = OTPCode(user_id=user_id, code=code, expires_at=expires_at)
        db.add(otp)
        db.commit()
        return code

    @staticmethod
    def verify(db: Session, user_id: str, code: str) -> bool:
        otp = (
            db.query(OTPCode)
            .filter(OTPCode.user_id == user_id, OTPCode.code == code)
            .first()
        )
        if not otp:
            return False
        if otp.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
            return False
        db.delete(otp)
        db.commit()
        return True