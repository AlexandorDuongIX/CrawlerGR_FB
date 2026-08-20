# NEO-BOT - Facebook Group Scraper & Command Center

NEO-BOT is an automated Facebook Group scraping tool and management dashboard. It uses Playwright to continuously scan a configured pool of Facebook public groups, extract new posts (authors, captions, links, and timestamps), and store them into a PostgreSQL database. It includes a FastAPI backend and a modern React frontend dashboard with a cyberpunk/neon aesthetic to monitor the bot's status and review scraped signals in real-time.

## Features

- **Automated Scraping:** Continuous background scraping using Playwright (headless or UI mode).
- **No API Key Required:** Simulates real user browser behavior to bypass API limits on public groups.
- **Smart Deduping & Cleanup:** Stores posts in PostgreSQL, prevents duplicate entries, and automatically purges posts older than 5 days.
- **Real-Time Dashboard:** React 19 + Vite frontend with a beautiful dark/neon UI for monitoring system status, injected targets, and a signal feed.
- **Group Management:** Add, activate, pause, or delete target Facebook groups directly from the dashboard.
- **One-Click Launcher:** Includes a `START_NEOBOT.bat` script to spin up the entire stack on Windows.

## Tech Stack

- **Backend:** Python 3, FastAPI, Uvicorn, Playwright, psycopg2
- **Frontend:** React 19, Vite, Tailwind CSS
- **Database:** PostgreSQL

## Prerequisites

1. **Python 3.9+**
2. **Node.js (v18+)**
3. **PostgreSQL** installed and running locally.

## Setup Instructions

### 1. Database Configuration
1. Open PostgreSQL (pgAdmin or psql) and create a new database named `GR_Crawler`.
2. Ensure the default user is `postgres` with password `postgres`, running on `localhost:5432`.
   *(If your DB credentials differ, update the `DB_CONFIG` inside `FacebookGroupScraper/src/database.py`)*.
3. The application will automatically create the necessary tables (`posts` and `groups`) on first startup.

### 2. Backend Setup
1. Clone the repository and navigate to the `FacebookGroupScraper` folder.
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Install Playwright browsers:
   ```bash
   playwright install chromium
   ```

### 3. Frontend Setup
1. Navigate to the `FacebookGroupScraper/FE` directory.
2. Install npm dependencies:
   ```bash
   cd FacebookGroupScraper/FE
   npm install
   ```

## Running the Application

### Option 1: Quick Start (Windows)
Run the provided batch script in the root directory:
```bash
START_NEOBOT.bat
```
This will automatically launch the Backend on port 8000, the Frontend on port 3000, and open your default browser to the dashboard.

### Option 2: Manual Start
**Terminal 1 (Backend):**
```bash
cd FacebookGroupScraper
python -m uvicorn BE.main:app --port 8000
```
**Terminal 2 (Frontend):**
```bash
cd FacebookGroupScraper/FE
npm run dev
```

## Usage

1. Open `http://localhost:3000` in your browser.
2. Navigate to **GROUP MANAGEMENT** on the left sidebar to add Target URLs (must be valid Facebook Group links).
3. Click the **START** button in the header to initialize the bot. It will begin cycling through active groups.
4. Navigate to the **POSTS DASHBOARD** to view the live feed of scraped posts.

## Architecture Notes

- The FastAPI server runs the API endpoints on the main thread, while the Playwright bot runs on a dedicated background thread to prevent blocking HTTP requests.
- The system is designed to be highly resilient; if a group fails to scrape or the browser crashes, the bot manager will attempt to restart the browser automatically.
