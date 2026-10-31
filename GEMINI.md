# GEMINI / ANTIGRAVITY AGENT RULES

> Quy định bắt buộc dành cho Antigravity AI khi làm việc trong dự án Passion Star:

## 🚨 BẮT BUỘC CẬP NHẬT `PROGRESS.md` KHI SỬA CODE
Mỗi khi tạo mới, chỉnh sửa, gỡ lỗi (debug) hoặc tối ưu code trong bất kỳ file nào của dự án:
- **Phải luôn cập nhật file [PROGRESS.md](PROGRESS.md)** tại bảng `6. Nhật Ký Cập Nhật Code (Changelog)`.
- Ghi rõ ngày giờ, file đã sửa đổi, mục đích và nội dung tóm tắt.
- Nếu thêm tính năng hoặc màn hình mới, bổ sung vào bảng danh mục module trong `PROGRESS.md`.

## 🚨 TUYỆT ĐỐI KHÔNG DÙNG `alert()`, `prompt()`, `confirm()` NGUYÊN BẢN CỦA TRÌNH DUYỆT
- Cấm hoàn toàn việc gọi `alert()`, `prompt()`, `confirm()` mặc định của trình duyệt.
- Mọi tương tác nhập liệu hoặc xác nhận phải sử dụng Modal UI Glassmorphism riêng biệt của hệ thống; thông báo ngắn sử dụng `showToast()`.

Chi tiết hướng dẫn kỹ thuật: Xem thêm tại [AGENTS.md](AGENTS.md).
