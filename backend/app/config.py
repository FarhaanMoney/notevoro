from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    cors_origins: str = "https://notevoro.com,https://www.notevoro.com,http://localhost:3000,http://localhost:3001,http://127.0.0.1:*"
    auth_provider: str = "local"
    local_auth_secret: str = "change-me"
    cognito_region: str = ""
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    aws_region: str = ""
    s3_bucket: str = ""
    sqs_queue_url: str = ""
    local_storage_dir: str = "./.storage"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    # --- Supabase Realtime (used for collaboration; blank => 503 REALTIME_NOT_CONFIGURED) ---
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    zoom_client_id: str = ""
    zoom_client_secret: str = ""

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_anon_key.strip())

    @property
    def supabase_admin_configured(self) -> bool:
        return bool(self.supabase_configured and self.supabase_service_role_key.strip())

    google_client_id: str = ""
    google_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
