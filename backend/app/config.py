from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    cors_origins: str = "*"
    auth_provider: str = "local"
    local_auth_secret: str = "change-me"
    cognito_region: str = ""
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    aws_region: str = ""
    s3_bucket: str = ""
    sqs_queue_url: str = ""
    local_storage_dir: str = "/app/backend/.storage"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    liveblocks_secret_key: str = ""
    zoom_client_id: str = ""
    zoom_client_secret: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
