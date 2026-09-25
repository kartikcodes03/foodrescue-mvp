from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    DATABASE_URL: str = "postgresql+psycopg2://foodrescue:foodrescue@localhost:5432/foodrescue"
    SECRET_KEY: str = "dev-secret"
    TOKEN_EXPIRE_MIN: int = 60 * 24
    ADMIN_EMAIL: str = "admin@foodrescue.local"
    ADMIN_PASSWORD: str = "admin123"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

settings = Settings()
