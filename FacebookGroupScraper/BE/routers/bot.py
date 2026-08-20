"""Bot control routes: start, stop, quit, status."""
from fastapi import APIRouter

from BE.bot_manager import bot_manager

router = APIRouter(prefix="/bot", tags=["Bot Control"])


@router.get("/status")
def get_status():
    """Get current bot status."""
    return bot_manager.get_status()


@router.post("/start")
def start_bot():
    """Start the scraping loop."""
    return bot_manager.start()


@router.post("/stop")
def stop_bot():
    """Stop the scraping loop (browser stays open)."""
    return bot_manager.stop()


@router.post("/quit")
def quit_bot():
    """Stop scraping and close browser completely."""
    return bot_manager.quit()
