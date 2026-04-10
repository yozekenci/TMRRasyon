from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/tmr.db"
    app_name: str = "TMR Rasyon Programı"

    class Config:
        env_file = ".env"


settings = Settings()
