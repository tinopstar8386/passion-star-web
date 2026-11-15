# GEMINI / ANTIGRAVITY AGENT RULES

> Quy định bắt buộc dành cho Antigravity AI khi làm việc trong dự án Passion Star:

## 🚨 BẮT BUỘC ĐỌC & CẬP NHẬT SPEC (`spec.md` & `docs/specs/`) TRƯỚC KHI SỬA CODE
Mỗi khi sửa đổi, nâng cấp hoặc viết lại bất kỳ file code nào trong dự án:
- **Phải đọc trước [spec.md](../spec.md) (hoặc [docs/SPEC.md](SPEC.md)) và file đặc tả chi tiết tương ứng trong [docs/specs/](specs/)** để không làm rơi rớt bất kỳ chức năng, endpoint, Firestore path, `localStorage` key hay quy tắc UI nào (cấm native `alert`/`confirm`/`prompt`, giữ PIN `'0908'`, Dark Glassmorphism, bảo mật token tránh GH013).
- **Nếu thay đổi hành vi, dữ liệu hoặc thêm tính năng mới:** Phải cập nhật lại file `docs/specs/<module>.spec.md` tương ứng và đồng bộ `spec.md` / `docs/SPEC.md`.

## 🚨 BẮT BUỘC CẬP NHẬT `PROGRESS.md` KHI SỬA CODE
Mỗi khi tạo mới, chỉnh sửa, gỡ lỗi (debug) hoặc tối ưu code trong bất kỳ file nào của dự án:
- **Phải luôn cập nhật file [PROGRESS.md](PROGRESS.md)** tại bảng `6. Nhật Ký Cập Nhật Code (Changelog)`.
- Ghi rõ ngày giờ, file đã sửa đổi, mục đích và nội dung tóm tắt.
- Nếu thêm tính năng hoặc màn hình mới, bổ sung vào bảng danh mục module trong `PROGRESS.md`.

## 🚨 TUYỆT ĐỐI KHÔNG DÙNG `alert()`, `prompt()`, `confirm()` NGUYÊN BẢN CỦA TRÌNH DUYỆT
- Cấm hoàn toàn việc gọi `alert()`, `prompt()`, `confirm()` mặc định của trình duyệt.
- Mọi tương tác nhập liệu hoặc xác nhận phải sử dụng Modal UI Glassmorphism riêng biệt của hệ thống; thông báo ngắn sử dụng `showToast()`.

Chi tiết hướng dẫn kỹ thuật: Xem thêm tại [AGENTS.md](AGENTS.md).

## 🧭 ĐIỀU HƯỚNG MÃ NGUỒN VỚI CODEGRAPH
- Dự án đã tích hợp CodeGraph kiến trúc AST & SQLite Knowledge Graph.
- Ưu tiên sử dụng `codegraph explore`, `codegraph node`, `codegraph callers` và `codegraph affected` trước khi đọc dàn trải các file HTML/JS để tối ưu token và kiểm soát tác động thay đổi code.
