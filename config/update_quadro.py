import json
import os
import io

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

FILE_ID = "1vo_96XYZY_eAccOPFnLHEGGKJtISGfCd"

service_account_info = json.loads(
    os.environ["GOOGLE_SERVICE_ACCOUNT"]
)

credentials = service_account.Credentials.from_service_account_info(
    service_account_info,
    scopes=["https://www.googleapis.com/auth/drive.readonly"]
)

service = build("drive", "v3", credentials=credentials)

request = service.files().get_media(fileId=FILE_ID)

arquivo = io.BytesIO()

downloader = MediaIoBaseDownload(arquivo, request)

done = False

while not done:
    status, done = downloader.next_chunk()

with open("quadro_db.json", "wb") as f:
    f.write(arquivo.getvalue())

print("quadro_db.json atualizado.")