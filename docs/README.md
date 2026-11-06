# ⭐ Passion Star Workspace Hub & Internal Management Suite

> Hệ thống điều hành & quản lý vận hành nội bộ đa nền tảng của **Passion Star** (Media, Livestream, Makeup, Nhân sự & KPI).

---

## 📂 Cấu Trúc Thư Mục Repository

| Thư mục / File | Chức Năng |
| :--- | :--- |
| **`*.html`** | Toàn bộ các module ứng dụng Web độc lập nằm trực tiếp tại thư mục gốc (chạy trực tiếp trên trình duyệt, không cần bundler). |
| [**`docs/`**](../docs/) | Toàn bộ tài liệu quy chuẩn phát triển, nhật ký tiến độ (`PROGRESS.md`), hướng dẫn Agent (`AGENTS.md`, `GEMINI.md`). |
| [**`bat/`**](../bat/) | Các file công cụ tự động hóa 1-click trên Windows (Đồng bộ GitHub, Khởi động Server...). |
| [**`api/`**](../api/) | Backend serverless API endpoints (Vercel / Cloud Functions). |
| [**`server/`**](../server/) | Máy chủ Node.js phục vụ API và phát triển cục bộ (`server.mjs`, `auto_subscribe.mjs`). |
| [**`scripts/`**](../scripts/) | Script tiện ích (`SyncDashboard.gs` Google Apps Script, setup PC, build KPI dashboard...). |
| [**`data/`**](../data/) | Cơ sở dữ liệu JSON sao lưu và seed mẫu (`tonkhomakeup_data.json`). |
| [**`icon/`**](../icon/) | Kho icon SVG & định danh giao diện hệ thống. |
| [**`img/`**](../img/) | Hình ảnh, tài nguyên banner, watermark và mỹ phẩm makeup. |
| [**`tests/`**](../tests/) | Script kiểm thử tự động Pentest (Headless Chrome/Edge) & ảnh minh chứng. |

---

## ⚡ Công Cụ Đồng Bộ GitHub 1-Click (`bat/`)

Tất cả các file thực thi tự động `.bat` được đặt gọn gàng trong thư mục [**`bat/`**](../bat/):

- **[`bat/1_SYNC_TU_GIT_VE_MAY.bat`](../bat/1_SYNC_TU_GIT_VE_MAY.bat)**: Nhấp đúp chuột để kéo toàn bộ mã nguồn mới nhất từ GitHub (`origin main`) về máy tính cục bộ (Git Pull).
- **[`bat/2_SYNC_TU_MAY_LEN_GIT.bat`](../bat/2_SYNC_TU_MAY_LEN_GIT.bat)**: Nhấp đúp chuột để tự động gom toàn bộ thay đổi (`git add -A`), tạo commit timestamp và đẩy thẳng lên GitHub (`origin main`) an toàn 100%.
- **[`bat/start_mail_activator.bat`](../bat/start_mail_activator.bat)**: Khởi động máy chủ backend local phục vụ Mail Activator.

---

## 🌐 Danh Sách Các Module Chính (Thư Mục Gốc)

| File | Tên Module | Chức Năng Chính |
| :--- | :--- | :--- |
| [`index.html`](../index.html) | **Workspace Hub** | Cổng điều hành trung tâm, điều hướng toàn bộ ứng dụng |
| [`off.html`](../off.html) | **Quản Lý Nghỉ Phép** | Chấm công, xin/duyệt off, phân quyền admin PIN 0908 |
| [`timeline.html`](../timeline.html) | **Timeline Makeup & Live** | Lịch ca trực makeup và livestream thời gian thực |
| [`idol_tracker.html`](../idol_tracker.html) | **Idol Media Tracker** | Quản lý clip TikTok theo tuần, KPI, báo cáo song ngữ Trung - Việt |
| [`task_media.html`](../task_media.html) | **Quản Lý Task Media** | Lịch sản xuất media, phân công nhân sự & deadline |
| [`smartpaste.html`](../smartpaste.html) | **Smart Paste Studio** | Trợ lý dán thông minh cho ô Merge 2 hàng Excel & Google Sheets |
| [`dashboard.html`](../dashboard.html) | **KPI Dashboard** | Báo cáo hiệu suất team vận hành |
| [`loichuc.html`](../loichuc.html) | **Workspace Lời Chúc** | Quản lý mẫu lời chúc Idol đạt mốc thưởng |
| [`tonkhomakeup.html`](../tonkhomakeup.html) | **Tồn Kho Makeup** | Xuất - nhập - tồn vật tư trang điểm |
| [`tonmakeup.html`](../tonmakeup.html) | **Đề Xuất Đồ Makeup** | Đề xuất mua sắm dụng cụ makeup |
| [`scripts/SyncDashboard.gs`](../scripts/SyncDashboard.gs) | **Google Apps Script KPI** | Tự động hóa đồng bộ bảng mẫu KPI Dashboard theo tháng |

---

## 📋 Tài Liệu Quy Chuẩn (`docs/`)
- Xem chi tiết tiến độ và nhật ký cập nhật tại: [**`docs/PROGRESS.md`**](PROGRESS.md).
- Quy tắc phát triển và tiêu chuẩn kỹ thuật: [**`docs/AGENTS.md`**](AGENTS.md) / [**`docs/GEMINI.md`**](GEMINI.md).
- Hướng dẫn Animate UI: [**`docs/ANIMATE_UI_GUIDE.md`**](ANIMATE_UI_GUIDE.md).
