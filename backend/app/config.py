from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Docker/Railway'de /data volume'una, yerel geliştirmede ./data'ya yazar
    database_url: str = "sqlite:///./data/tmr.db"
    app_name: str = "TMR Rasyon Programı"

    class Config:
        env_file = ".env"


settings = Settings()
