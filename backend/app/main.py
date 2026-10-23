
from fastapi import FastAPI

app = FastAPI(
    title="HR Recruitment API",
    description="API quản lý tuyển dụng nhân sự và xử lý CV ứng viên",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "message": "HR Recruitment API is running!",
        "status": "success",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "HR Recruitment API",
    }
