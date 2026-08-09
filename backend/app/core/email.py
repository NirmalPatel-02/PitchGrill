import requests
from app.core.config import settings


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """Sends the OTP via Brevo's HTTPS API. Returns True on success."""
    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "sender": {"name": settings.BREVO_SENDER_NAME, "email": settings.BREVO_SENDER_EMAIL},
            "to": [{"email": to_email}],
            "subject": "Your PitchGrill verification code",
            "htmlContent": f"<p>Your verification code is:</p><h2>{otp_code}</h2><p>This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.</p>",
        },
        timeout=10,
    )
    return response.status_code == 201