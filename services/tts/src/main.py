import os
from dotenv import load_dotenv

# 加载环境变量，一定要在导入其他业务模块之前
# 显式指定 .env 文件路径，确保能正确加载
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)
print(f"[main] Loaded .env from: {os.path.abspath(env_path)}")
print(f"[main] TTS_MINIMAX_API_KEY present: {bool(os.getenv('TTS_MINIMAX_API_KEY'))}")
print(f"[main] TTS_MINIMAX_GROUP_ID present: {bool(os.getenv('TTS_MINIMAX_GROUP_ID'))}")
print(f"[main] TTS_MIMO_API_TOKEN present: {bool(os.getenv('TTS_MIMO_API_TOKEN'))}")

# 启动时把 DB 中持久化的 provider 配置回写到 os.environ，
# 让现有 processor/engine 直接从环境变量读取，无需修改核心逻辑。
from src.core.settings_manager import hydrate_from_db
hydrate_from_db()
print("[main] TTS provider configs hydrated from DB")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.web_api import auth, settings, tasks

app = FastAPI(title="Novel-TTS-Pro", version="1.0.0")

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载前端静态文件 (假设编译后在 frontend/dist)
# app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])

@app.on_event("startup")
async def startup_event():
    """
    启动时自动恢复未完成的任务
    """
    from src.database.models import engine, Task
    from src.core.processor import processor
    from sqlmodel import Session, select
    import asyncio

    with Session(engine) as db:
        statement = select(Task).where(Task.status.in_(["pending", "processing"]))
        pending_tasks = db.exec(statement).all()
        
        for task in pending_tasks:
            # 使用 asyncio.create_task 避免阻塞启动
            asyncio.create_task(processor.process_task(task.id))

@app.get("/api/health")
async def health():
    return {"status": "ok"}

import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    try:
        logger.info("Starting TTS Service on port 8000...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except Exception as e:
        logger.error(f"❌ TTS Service failed to start: {e}", exc_info=True)
        sys.exit(1)
