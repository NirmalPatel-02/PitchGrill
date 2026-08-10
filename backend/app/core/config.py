from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "PitchGrill"

    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "pitchgrill"
    DB_SSL_CA: Optional[str] = None 

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    @property
    def DB_CONNECT_ARGS(self) -> dict:

        if self.MYSQL_HOST in ("localhost", "127.0.0.1"):
            return {}

        return {
            "ssl_verify_cert": True,
            "ssl_verify_identity": True,
            "ssl_ca": self.DB_SSL_CA,
        }

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    BREVO_API_KEY: str
    BREVO_SENDER_EMAIL: str
    BREVO_SENDER_NAME: str = "PitchGrill"

    OTP_EXPIRE_MINUTES: int = 10
    MAX_SESSIONS_PER_USER: int = 2

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

# from pydantic_settings import BaseSettings, SettingsConfigDict

# class Settings(BaseSettings):
#     PROJECT_NAME: str = "PitchGrill"

#     MYSQL_USER: str = "root"
#     MYSQL_PASSWORD: str = ""
#     MYSQL_HOST: str = "localhost"
#     MYSQL_PORT: int = 3306
#     MYSQL_DB: str = "pitchgrill"

#     @property
#     def DATABASE_URL(self) -> str:
#         return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

#     JWT_SECRET: str
#     JWT_ALGORITHM: str = "HS256"
#     ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

#     BREVO_API_KEY: str
#     BREVO_SENDER_EMAIL: str
#     BREVO_SENDER_NAME: str = "PitchGrill"

#     OTP_EXPIRE_MINUTES: int = 10
#     MAX_SESSIONS_PER_USER: int = 2

#     model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# settings = Settings()