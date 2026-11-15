# Đặc tả kỹ thuật — API Proxy, Scripts tự động hóa, Batch, Cấu hình & Kiểm thử E2E/Pentest

- **Phạm vi file nguồn:**
  - **Ứng dụng Desktop Windows (`desktop/` & root):** `desktop/Passion2FA.cs` (+1,124 dòng), `Passion2FA.exe`, `bat/start_2fa_app.bat`
  - **API Vercel Serverless (`api/`):** `api/proxy.js`, `api/proxy-loichuc.js`, `api/auto-subscribe.js`
  - **Local Server (`server/`):** `server/server.mjs`, `server/auto_subscribe.mjs`
  - **Scripts vận hành & KPI (`scripts/`):** `scripts/ai-optimizer.mjs`, `scripts/setup_company_pc.ps1`, `scripts/kpi_dashboard/build_dashboard.ps1`, `scripts/kpi_dashboard/data_row_formats.json`, `scripts/kpi_dashboard/header_formats.json` *(Ghi chú: 5 script cũ `zalo_antigravity_bot.mjs`, `add_zalo_to_service.mjs`, `find_login_exact.mjs`, `show_login_dom.mjs`, `show_login_lines.mjs` đã được dọn bỏ trên `origin/main`)*
  - **Batch scripts (`bat/`):** `bat/1_SYNC_TU_GIT_VE_MAY.bat`, `bat/2_SYNC_TU_MAY_LEN_GIT.bat`, `bat/start_lightpanda.bat`, `bat/start_mail_activator.bat`, `bat/start_2fa_app.bat`
  - **Kiểm thử tự động (`tests/`):** `tests/lightpanda_runner.mjs`, `tests/pentest_2fa_ui.mjs`, `tests/pentest_idol_tracker.mjs`, `tests/pentest_mobile_all.mjs`, `tests/run_full_event_pentest.js`, `tests/run_smartpaste_pentest.js` (+ ảnh kết quả trong `tests/screenshots/`)
  - **Cấu hình, Icon & CI/CD:** `manifest.json`, `icon/2fa.ico`, `icon/task_media.svg`, `icon/png/*.png`, `.github/workflows/gemini-optimize.yml`, `.gitignore`, video media `Hieuung.mp4`, `Hieuung_clean_final.mp4`

---

## 1. Ứng Dụng Desktop Windows, Vercel API Proxy & Local Server (`desktop/`, `api/`, `server/`)

1. **Passion 2FA Desktop App (`desktop/Passion2FA.cs`, `Passion2FA.exe`, `bat/start_2fa_app.bat`):**
   - Ứng dụng WinForms C# (`namespace PassionStarDesktop`, `DesktopControllerForm`), chống chạy trùng instance bằng named event `Local\PassionStar_2FA_Desktop_Wakeup_Event` (`StartWakeListener`).
   - Tự động khởi chạy ngầm `node server/server.mjs` (`nodeProcess`) và cửa sổ trình duyệt chế độ App (`browserProcess` trỏ tới `http://127.0.0.1:3000/2fa.html?desktop=1`), theo dõi vòng đời (`MonitorWindowTick`, `ApplyWindowIcons`, `BringToForeground`).
   - Khay hệ thống (`NotifyIcon`) và **Phím tắt toàn cục (`RegisterGlobalHotKeys`)**: `Alt+Shift+A` ẩn/hiện cửa sổ, `Alt+Shift+T` bật/tắt ghim nổi trên cùng (`ApplyTopMostWin32`), `Alt+Shift+B` kích hoạt Boss Key, `Alt+Shift+L` khóa PIN nhanh (`SendLockPinCommand`).
   - Tự tạo shortcut Desktop (`CreateDesktopShortcut`) và giao tiếp 2 chiều với web qua `/api/desktop/*` (`StartCommandPolling`, `HandleCommandFromWeb`, `PostNativeEvent`).
2. **`api/proxy.js` (Proxy Vercel cho `2fa.html` -> Google Apps Script):**
   - Xử lý chống double-stringify payload (`doubleParsed`) và parser an toàn `parseGasResponse` (bóc lỗi HTML trả về JSON `{ status: 'error', message }`).
   - Chuyển tiếp tới GAS `AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec`: **ưu tiên gửi `GET ?req=<encodedReq>`** khi `encodedReq.length <= 3500` để `doGet` của GAS xử lý đầy đủ lấy OTP mail, forward, thiết bị; tự động **dự phòng `POST`** (`text/plain;charset=utf-8`) khi payload lớn hoặc GET không trả status/data hợp lệ.
3. **`api/proxy-loichuc.js` (Proxy cho `loichuc.html`):** Đã mô tả chi tiết tại `docs/specs/loichuc.spec.md` — forward POST tới GAS endpoint của Lời Chúc (`AKfycbyUnPauRyR_...`).
4. **`server/server.mjs` (Local HTTP + Proxy + Desktop Bridge trên `PORT` mặc định `3000`):**
   - Phục vụ file tĩnh (có bảo vệ chống truy cập ngoài thư mục dự án, trả `403 Forbidden`).
   - `POST /api/proxy`: Chuyển tiếp tới GAS URL `AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec`.
   - `POST /api/auto-subscribe`: Kết nối `server/auto_subscribe.mjs` cho `mail_activator.html`.
   - **Bộ API Desktop Bridge (`/api/desktop/*`):** `GET /api/desktop/health`, `GET /api/desktop/state`, `GET /api/desktop/poll-native`, `GET /api/desktop/poll-web`, `POST /api/desktop/command`, `POST /api/desktop/native-event`.
5. **`api/auto-subscribe.js` & `server/auto_subscribe.mjs`:** Đã mô tả chi tiết tại `docs/specs/mail_activator.spec.md`.

---

## 2. CI/CD & Scripts Tiện Ích (`scripts/`, `.github/`)

1. **`.github/workflows/gemini-optimize.yml` + `scripts/ai-optimizer.mjs`:**
   - GitHub Actions `workflow_dispatch` nhận 2 inputs: `target_file` (mặc định `index.html`) và `custom_prompt`.
   - Thiết lập Node.js 20, chạy `node scripts/ai-optimizer.mjs` với `GEMINI_API_KEY` secret gọi Gemini model `gemini-2.5-flash` (`temperature: 0.2`), yêu cầu trả về full file không bọc markdown ` ``` `, ghi đè `target_file`, rồi dùng `peter-evans/create-pull-request@v6` mở Pull Request nhánh `gemini-patch-${{ github.run_id }}` để review diff trước khi merge.
2. **KPI Dashboard CLI Automation (`scripts/kpi_dashboard/`):**
   - `build_dashboard.ps1`: Gọi `gsheets mutate raw-batch` lên Spreadsheet `1NCd7WbR982EDzdfJ7bDJzvxxeGDFffVUb9fKNPGeFBg` (sheet `KPI_DASHBOARD`, `sheetId = 865830553`) sử dụng cấu hình format trong `header_formats.json` và `data_row_formats.json` (tạo file tạm `req_unmerge.json` khi chạy).
3. **Setup Script (`scripts/setup_company_pc.ps1`):**
   - Thiết lập đồng bộ môi trường trên máy công ty (kiểm tra Git/Node.js, clone `~/.gemini/config` & cấu hình `skills.json`).

---

## 3. Windows Batch Scripts (`bat/`)

- `bat/1_SYNC_TU_GIT_VE_MAY.bat`: Kéo code mới nhất từ `git pull origin main`.
- `bat/2_SYNC_TU_MAY_LEN_GIT.bat`: Auto-stage (`git add -A`), commit có timestamp nếu có thay đổi, pull `--rebase --autostash` / push lên GitHub. *(Lưu ý vận hành: nếu local đang có thư mục nháp chưa track như `Storyboard/`, không dùng nút auto `add -A` mà phải add chọn lọc).*
- `bat/start_2fa_app.bat`: Khởi chạy trực tiếp `Passion2FA.exe` trên Windows (báo lỗi nếu thiếu file exe).
- `bat/start_lightpanda.bat`: Kiểm tra cổng CDP `9222` hoặc khởi chạy Docker container `lightpanda` cho kiểm thử headless siêu nhẹ.
- `bat/start_mail_activator.bat`: Mở trình duyệt tại `http://localhost:3000/mail_activator.html` và khởi chạy `node server/server.mjs` (ưu tiên `agy-node.cmd` nếu có).

---

## 4. Bộ Kiểm Thử Tự Động & Pentest E2E (`tests/`)

1. **`tests/lightpanda_runner.mjs` (`launchBrowser`, `connectSession`):**
   - Adapter đa engine điều khiển trình duyệt qua **Chrome DevTools Protocol (CDP)** + WebSocket:
     1. Ưu tiên kết nối CDP Server đang chạy sẵn ở port `9222` / `cdpPort` (`9234`).
     2. Chạy binary `LIGHTPANDA_EXECUTABLE_PATH` nếu có.
     3. Native Windows Fallback tự động sang Chrome (`chrome.exe`) hoặc Microsoft Edge (`msedge.exe`) headless với `--remote-debugging-port`.
   - Hỗ trợ cung cấp helper `sendCdp(method, params)` cho toàn bộ kịch bản test.
2. **`tests/pentest_2fa_ui.mjs`:**
   - Khởi tạo HTTP server local phục vụ `2fa.html`, kết nối CDP qua `lightpanda_runner.mjs`, kiểm thử màn hình khóa Stealth Key (`#stealthPassTrigger`), dark grid, skeleton loading và device modal gọn, xuất ảnh kiểm chứng vào `tests/screenshots/` (`pentest_2fa_dark_grid.png`, `pentest_2fa_skeleton.png`).
3. **`tests/pentest_idol_tracker.mjs`:**
   - Kiểm thử tự động `idol_tracker.html` thông qua `lightpanda_runner.mjs` với các ESM stub in-memory `/__mock/firebase-{app,auth,firestore}.js` đảm bảo **không bao giờ chạm Firestore production** khi chạy test.
4. **`tests/pentest_mobile_all.mjs`:**
   - Chạy kiểm thử hàng loạt giao diện mobile (`node tests/pentest_mobile_all.mjs <file1.html> ...`) kết hợp mock `/api/*` trả JSON `{ status: 'ok', data: null }`.
5. **`tests/run_full_event_pentest.js`:**
   - Chạy Microsoft Edge headless CDP (port `9240`) mở `timeline.html`, đợi `document.fonts.ready` (font Inter Tiếng Việt), kiểm tra style `.badge-room` trên `#timelineBody`, test render canvas HD (`renderPCQualityCanvas('capture-wrapper-daily')`) cho Daily/Event Tab & trạng thái Room ON/OFF, xuất screenshot kiểm chứng.
6. **`tests/run_smartpaste_pentest.js`:**
   - Chạy Microsoft Edge headless CDP (port `9242`) mở `smartpaste.html`, bơm chuỗi thô có nhiễu (`1. christ`, `2/ roy`, `[03] wren`, `* elena`, `- MINA`, `christ (duplicate)`), gọi `processInput()`, xác minh `cleanedItems` và kiểm tra HTML bảng clipboard (`generateMergeTableHtml` — font Arial 12pt Bold căn giữa).

---

## 5. PWA Manifest, Icons & Asset Media Gốc

- **`manifest.json`:** Định nghĩa PWA **"Passion 2FA Security Hub"** (`short_name: "Passion 2FA"`), `start_url: "./2fa.html"`, `display: "standalone"`, nền `#090d16`, theme `#090d16`, icon `./icon/png/2fa.png` (`180x180`) và `./icon/2fa.svg` (`image/svg+xml`).
- **Icons, Media & `.gitignore`:** Bộ icon `icon/2fa.ico`, `icon/task_media.svg`, `icon/png/*.png` (`2fa.png`, `chucmung.png`, `control.png`, `idol_tracker.png`, `newsletter.png`, `off.png`, `task_media.png`, `timeline.png`); `Hieuung.mp4` & `Hieuung_clean_final.mp4`, ảnh `tests/screenshots/*.png`, `img/*`; `.gitignore` cấu hình loại trừ file tạm, node_modules, `.env`, `.codegraph/`.

---

## 6. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ cơ chế `GET ?req=...` (`<= 3500` chars) kèm fallback `POST` trong `api/proxy.js` và endpoint `POST /api/proxy` + Desktop Bridge `/api/desktop/*` trên `server/server.mjs` để hỗ trợ cả Vercel lẫn `Passion2FA.exe`.
- [ ] Giữ đồng bộ hotkey/bridge giữa `desktop/Passion2FA.cs` (`Alt+Shift+A/T/B/L`, `Local\PassionStar_2FA_Desktop_Wakeup_Event`) và `2fa.html?desktop=1`.
- [ ] Không sửa `gemini-optimize.yml` theo hướng auto-merge trực tiếp lên `main` (phải luôn đi qua Pull Request để review).
- [ ] Bảo toàn CDP multi-engine fallback (`Lightpanda -> Chrome -> Edge`) trong `tests/lightpanda_runner.mjs` và mock Firestore `/__mock/*` trong `tests/pentest_idol_tracker.mjs`.
- [ ] Không đưa token thật hay Gemini API key vào tài liệu hoặc commit mới.
