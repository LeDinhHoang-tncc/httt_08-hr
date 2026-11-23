from pathlib import Path

from docx import Document
from pypdf import PdfReader

from app.services.file_service import get_cv_path


def extract_cv_text(relative_path: str) -> str:
    """
    Trích xuất nội dung văn bản từ CV PDF hoặc DOCX.
    """
    file_path = get_cv_path(relative_path)
    extension = Path(relative_path).suffix.lower()

    if extension == ".pdf":
        reader = PdfReader(str(file_path))

        text = "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        )

    elif extension == ".docx":
        document = Document(str(file_path))

        paragraphs = [
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        table_text = [
            cell.text
            for table in document.tables
            for row in table.rows
            for cell in row.cells
            if cell.text.strip()
        ]

        text = "\n".join(paragraphs + table_text)

    else:
        raise ValueError("Định dạng CV không được hỗ trợ.")

    text = text.strip()

    if not text:
        raise ValueError(
            "Không trích xuất được văn bản từ CV. "
            "Có thể file PDF là bản scan hoặc không chứa văn bản."
        )

    return text
