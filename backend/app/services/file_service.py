import uuid
import zipfile
from pathlib import Path
from io import BytesIO

from fastapi import UploadFile, HTTPException, status


# backend/storage/cvs
BASE_DIR = Path(__file__).resolve().parents[2]
CV_STORAGE_DIR = BASE_DIR / "storage" / "cvs"

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

ALLOWED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


async def save_cv(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng chọn file CV.",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận file PDF hoặc DOCX.",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File CV không được để trống.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dung lượng CV không được vượt quá 5 MB.",
        )

    # Kiểm tra chữ ký file PDF
    if extension == ".pdf":
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nội dung file không phải PDF hợp lệ.",
            )

    # Kiểm tra cấu trúc file DOCX
    if extension == ".docx":
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                if "word/document.xml" not in archive.namelist():
                    raise ValueError("Invalid DOCX")
        except (zipfile.BadZipFile, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nội dung file DOCX không hợp lệ.",
            )

    # Tạo tên file ngẫu nhiên, không sử dụng tên gốc
    new_filename = f"{uuid.uuid4().hex}{extension}"

    CV_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    file_path = CV_STORAGE_DIR / new_filename

    try:
        file_path.write_bytes(content)
    except OSError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể lưu file CV.",
        )

    # Lưu đường dẫn tương đối vào database
    return f"storage/cvs/{new_filename}"

def delete_cv(relative_path: str) -> None:
    storage_dir = CV_STORAGE_DIR.resolve()
    file_path = (BASE_DIR / relative_path).resolve()

    # Đảm bảo file nằm bên trong thư mục lưu CV
    if storage_dir not in file_path.parents:
        raise ValueError("Đường dẫn file CV không hợp lệ.")

    file_path.unlink(missing_ok=True)