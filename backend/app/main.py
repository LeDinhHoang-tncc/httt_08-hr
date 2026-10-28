from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.application import router as applications_router

app = FastAPI(
    title="HR Recruitment API",
    description="API quản lý tuyển dụng nhân sự và xử lý CV ứng viên",
    version="0.1.0",
)

app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(applications_router)

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
