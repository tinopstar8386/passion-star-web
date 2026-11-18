---
trigger: always_on
---

# Auto Git Commit & Push

- Sau khi hoàn tất chỉnh sửa và kiểm thử bất kỳ file nào trong workspace `z:\Passion Star Code`, luôn tự động chạy `git add`, `git commit` (với thông điệp rõ ràng) và `git push` lên nhánh từ xa (`origin`) ngay lập tức mà **không cần hỏi lại người dùng**.
- Không bao giờ stage hoặc commit các thư mục/file tạm (`.tmp_*`, `temp_frames`, `node_modules`, `.codegraph`, `*.bak`, `*.tmp`).
- Trước khi hoàn tất lượt trả lời, kiểm tra `git status` để đảm bảo các thay đổi đã được commit và đồng bộ lên remote.
