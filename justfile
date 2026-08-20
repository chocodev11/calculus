# Justfile - Command Runner for Calculus Platform
# https://github.com/casey/just

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

# Hiển thị danh sách recipes khi chạy `just` không có tham số
default:
    @just --list

# Khởi chạy cả Backend và Frontend đồng thời
host:
    npx concurrently -n backend,frontend -c cyan.bold,green.bold "just backend" "just frontend"

# Khởi chạy FastAPI Backend
backend:
    cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Khởi chạy React Frontend
frontend:
    cd frontend; npm run dev

# Đồng bộ dữ liệu JSON vào Database SQLite
sync:
    cd backend; python sync_data.py

# Cài đặt toàn bộ dependencies cho backend và frontend
install:
    pip install -r backend/requirements.txt
    cd frontend; npm install

# Chạy kiểm tra toàn bộ dữ liệu khóa học
validate:
    python validate_all.py
