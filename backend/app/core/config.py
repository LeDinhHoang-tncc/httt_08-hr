import os
from dotenv import load_dotenv

load_dotenv(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        ".env",
    )
)


class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 #phiên đăng nhập test 30s


settings = Settings()

if not settings.SECRET_KEY:
    raise RuntimeError(
        "Chưa cấu hình SECRET_KEY trong file backend/.env"
    )
