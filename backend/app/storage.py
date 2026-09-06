"""Object storage adapter: S3 (presigned) in production, local disk when S3_BUCKET is blank."""
import os
import uuid

from .config import settings


class LocalStorage:
    name = "local"

    def __init__(self):
        os.makedirs(settings.local_storage_dir, exist_ok=True)

    def key_for(self, space_id: str, filename: str):
        return f"{space_id}/{uuid.uuid4().hex}-{os.path.basename(filename)}"

    async def put(self, key: str, data: bytes, content_type: str):
        path = os.path.join(settings.local_storage_dir, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)

    async def get(self, key: str) -> bytes:
        with open(os.path.join(settings.local_storage_dir, key), "rb") as f:
            return f.read()

    async def delete(self, key: str):
        try:
            os.remove(os.path.join(settings.local_storage_dir, key))
        except FileNotFoundError:
            pass

    def download_url(self, key: str, file_id: str, space_id: str):
        return f"/api/v1/spaces/{space_id}/files/{file_id}/content"


class S3Storage(LocalStorage):
    name = "s3"

    def __init__(self):
        import boto3
        self.client = boto3.client("s3", region_name=settings.aws_region or None)
        self.bucket = settings.s3_bucket

    async def put(self, key, data, content_type):
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type, ServerSideEncryption="AES256")

    async def get(self, key):
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    async def delete(self, key):
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def download_url(self, key, file_id, space_id):
        return self.client.generate_presigned_url("get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=900)


storage = S3Storage() if settings.s3_bucket else LocalStorage()
