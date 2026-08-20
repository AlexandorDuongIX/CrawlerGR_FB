"""FastAPI backend for the Facebook Group Scraper.

Run with:
    uvicorn BE.main:app --reload --port 8000
(from the FacebookGroupScraper root directory)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import init_db
from BE.routers import bot, groups, posts


# ── Lifespan ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run on startup / shutdown."""
    # Startup
    init_db()
    yield
    # Shutdown — make sure scraper is stopped
    from BE.bot_manager import bot_manager
    bot_manager.quit()


# ── App ───────────────────────────────────────
app = FastAPI(
    title="Facebook Group Scraper API",
    description="API để quản lý bot scraper, nhóm Facebook và xem bài viết đã crawl.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — cho phép frontend gọi API ─────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Sẽ thu hẹp lại khi deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ───────────────────────────
app.include_router(bot.router)
app.include_router(groups.router)
app.include_router(posts.router)


# ── Health check ──────────────────────────────
@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Facebook Group Scraper API is running 🚀"}
