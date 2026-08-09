from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.email import send_otp_email
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, VerifyOTP, ResendOTP
from app.repositories.user_repo import UserRepository
from app.repositories.opt_repo import OTPRepository

router = APIRouter(prefix="/auth", tags=["Authentication"])
security_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(get_db)):
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserRepository.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return user


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing_user = UserRepository.get_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    hashed_pwd = hash_password(user_data.password)
    new_user = UserRepository.create(
        db,
        email=user_data.email,
        password_hash=hashed_pwd,
        age=user_data.age,
        full_name=user_data.full_name,
        company_name=user_data.company_name,
    )

    code = OTPRepository.create(db, new_user.user_id)
    email_sent = send_otp_email(new_user.email, code)
    if not email_sent:
        print(f"[warning] OTP email failed to send to {new_user.email}")

    return {"message": "Registered. Check your email for a verification code."}


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: VerifyOTP, db: Session = Depends(get_db)):
    user = UserRepository.get_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not OTPRepository.verify(db, user.user_id, payload.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code.")

    UserRepository.mark_verified(db, user.user_id)
    access_token = create_access_token(subject=user.user_id)
    return TokenResponse(access_token=access_token)


@router.post("/resend-otp")
def resend_otp(payload: ResendOTP, db: Session = Depends(get_db)):
    user = UserRepository.get_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="This account is already verified.")

    code = OTPRepository.create(db, user.user_id)
    send_otp_email(user.email, code)
    return {"message": "A new code has been sent."}


@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = UserRepository.get_by_email(db, user_data.email)
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")

    access_token = create_access_token(subject=user.user_id)
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user