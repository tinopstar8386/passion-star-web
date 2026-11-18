# Workspace Rules — Passion Star Code

## Auto Git Commit & Push

- Sau khi hoàn tất chỉnh sửa và kiểm thử bất kỳ file nào trong workspace `z:\Passion Star Code`, luôn tự động chạy `git add`, `git commit` (với thông điệp rõ ràng, chuẩn Conventional Commits) và `git push` lên nhánh từ xa (`origin`) ngay lập tức mà **không cần hỏi lại người dùng**.
- Không bao giờ stage hoặc commit các thư mục/file tạm (`.tmp_*`, `temp_frames`, `node_modules`, `.codegraph`, `*.bak`, `*.tmp`).
- Nếu `git push` bị từ chối do nhánh remote có commit mới hơn, thực hiện `git pull --rebase` rồi push lại (nếu có conflict thì dừng và báo người dùng).
