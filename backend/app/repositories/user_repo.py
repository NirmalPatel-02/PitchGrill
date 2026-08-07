from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User

class UserRepository:

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.user_id == user_id).first()

    @staticmethod
    def create(db: Session, email: str, password_hash: str,full_name: Optional[str] = None,company_name: Optional[str] = None) -> User:
        user = User(
            email=email, 
            password_hash=password_hash,
            full_name=full_name,
            company_name=company_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user