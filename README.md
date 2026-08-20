# NEO-BOT - Công Cụ Quét Nhóm Facebook & Bảng Điều Khiển

NEO-BOT là hệ thống tự động quét dữ liệu từ các nhóm Facebook công khai và quản lý qua dashboard. Hệ thống sử dụng Playwright để liên tục quét danh sách các nhóm đã cấu hình, trích xuất bài viết mới (tên tác giả, nội dung, link bài viết, thời gian) và lưu trữ vào cơ sở dữ liệu PostgreSQL. Hệ thống bao gồm Backend (FastAPI) và Frontend (React 19 + Vite + Tailwind CSS) với giao diện dark/neon cực kỳ hiện đại để theo dõi trạng thái bot và xem các bài viết mới theo thời gian thực.

## Tính Năng Nổi Bật

- **Quét Tự Động:** Quét ngầm liên tục bằng Playwright (hỗ trợ chế độ ẩn giao diện headless hoặc hiện UI).
- **Không Cần API Key:** Giả lập hành vi người dùng thật trên trình duyệt để vượt qua giới hạn API của Facebook đối với các nhóm công khai.
- **Lọc Trùng & Dọn Dẹp Thông Minh:** Lưu trữ bài viết vào PostgreSQL, tự động bỏ qua các bài đã có, và **tự động xoá các bài viết cũ hơn 5 ngày** để tối ưu dữ liệu.
- **Dashboard Thời Gian Thực:** Giao diện React 19 + Vite phong cách Cyberpunk/Neon để theo dõi trạng thái hệ thống, thêm/sửa mục tiêu và xem luồng bài viết (Signal Feed).
- **Quản Lý Nhóm Mục Tiêu (Group Management):** Thêm, bật/tắt (active/pause), hoặc xoá các nhóm Facebook cần quét ngay trên web.
- **Khởi Động Nhanh (One-Click):** Tích hợp sẵn script `START_NEOBOT.bat` để chạy đồng thời toàn bộ hệ thống trên Windows chỉ bằng một cú click.

## Công Nghệ Sử Dụng

- **Backend:** Python 3, FastAPI, Uvicorn, Playwright, psycopg2
- **Frontend:** React 19, Vite, Tailwind CSS
- **Database:** PostgreSQL

## Yêu Cầu Hệ Thống

1. **Python 3.9+**
2. **Node.js (v18+)**
3. **PostgreSQL** đã được cài đặt và đang chạy trên máy.

## Hướng Dẫn Cài Đặt

### 1. Cấu Hình Cơ Sở Dữ Liệu (PostgreSQL)
1. Mở PostgreSQL (qua pgAdmin hoặc psql shell) và tạo một database mới có tên là `GR_Crawler`.
2. Theo mặc định, hệ thống sẽ kết nối với thông tin sau:
   - **Host:** `localhost`
   - **Port:** `5432`
   - **Database:** `GR_Crawler`
   - **Username:** `postgres`
   - **Password:** `postgres`
3. **Lưu ý quan trọng:** Nếu thông tin đăng nhập PostgreSQL của bạn khác với mặc định, bạn **phải mở file** `FacebookGroupScraper/src/database.py` và sửa lại phần `DB_CONFIG` cho đúng với cấu hình máy bạn:
   ```python
   DB_CONFIG = {
       "host": "localhost",
       "port": 5432,
       "dbname": "GR_Crawler",
       "user": "TÊN_USER_CỦA_BẠN",
       "password": "MẬT_KHẨU_CỦA_BẠN",
   }
   ```
4. Khi chạy lần đầu, ứng dụng sẽ tự động tạo các bảng (`posts` và `groups`) nếu chưa có.

### 2. Cài Đặt Backend
1. Clone repository và mở thư mục gốc.
2. Cài đặt các thư viện Python:
   ```bash
   pip install -r FacebookGroupScraper/requirements.txt
   ```
3. Cài đặt trình duyệt cho Playwright (để bot có thể giả lập):
   ```bash
   playwright install chromium
   ```

### 3. Cài Đặt Frontend
1. Chuyển vào thư mục `FacebookGroupScraper/FE`.
2. Cài đặt các gói thư viện Node.js:
   ```bash
   cd FacebookGroupScraper/FE
   npm install
   ```

## Hướng Dẫn Chạy Hệ Thống

### Cách 1: Chạy Nhanh (Dành cho Windows)
Chỉ cần nhấn đúp (hoặc chạy lệnh) file batch ở thư mục gốc:
```bash
START_NEOBOT.bat
```
Script này sẽ tự động bật Backend (port 8000), Frontend (port 3000), thu nhỏ các cửa sổ dòng lệnh và tự động mở trình duyệt web hiển thị Dashboard.

### Cách 2: Chạy Thủ Công
**Cửa sổ Terminal 1 (Backend):**
```bash
cd FacebookGroupScraper
python -m uvicorn BE.main:app --port 8000
```
**Cửa sổ Terminal 2 (Frontend):**
```bash
cd FacebookGroupScraper/FE
npm run dev
```

## Hướng Dẫn Sử Dụng

1. Truy cập `http://localhost:3000` trên trình duyệt.
2. Vào trang **GROUP MANAGEMENT** (cột bên trái) để thêm các Target URL (phải là link chuẩn của Group Facebook công khai).
3. Nhấn nút **START** ở menu trên cùng để khởi động Bot. Bot sẽ bắt đầu quét tuần tự các nhóm đang được bật (Active).
4. Vào trang **POSTS DASHBOARD** (Signal Feed) để xem danh sách các bài viết vừa được quét về.

## Kiến Trúc Hệ Thống (Architecture Notes)
- Server FastAPI xử lý các API endpoint trên thread chính, trong khi Bot Playwright được chạy trên một **background thread** riêng biệt để không làm treo hoặc chậm các API của web.
- Hệ thống được thiết kế để chống lỗi (resilient): nếu một nhóm bị lỗi trong quá trình quét hoặc trình duyệt gặp sự cố, Bot sẽ tự động đóng, khởi động lại trình duyệt và tiếp tục quét các nhóm tiếp theo.
