# 📘 PASSION STAR WEB — TÀI LIỆU ĐẶC TẢ KỸ THUẬT TỔNG HỢP (`spec.md`)

> [!IMPORTANT]
> **Mục tiêu sống còn của tài liệu này:** Lưu giữ 100% hợp đồng hành vi, API/endpoint, cấu trúc Firestore/`localStorage`, quy tắc UI và checklist chống mất tính năng cho toàn bộ codebase trên Git (`passion-star-web`).
>
> **Quy trình bắt buộc trước khi sửa hoặc viết lại code:**
> 1. Đọc tài liệu tổng hợp này (`spec.md` hoặc `docs/SPEC.md`) để nắm các bất biến toàn hệ thống.
> 2. Đọc file đặc tả chi tiết tương ứng trong thư mục `docs/specs/<module>.spec.md` trước khi chạm vào mã nguồn.
> 3. Sau khi hoàn tất thay đổi hành vi, API, schema hoặc UI mới, cập nhật lại `docs/specs/<module>.spec.md`, `spec.md`/`docs/SPEC.md` (nếu đổi hợp đồng tổng) và ghi nhật ký vào `docs/PROGRESS.md`.

---

## 1. Quy Tắc Bất Biến Toàn Dự Án (Global System Invariants)

1. **Kiến trúc No-Bundler Single-File HTML + Serverless/GAS:**
   - Các màn hình frontend hoạt động dưới dạng file `.html` độc lập (Vanilla HTML/CSS/JS), phối hợp cùng Google Apps Script (`scripts/*.gs`), Vercel Serverless Functions (`api/*.js`) và Node.js scripts (`server/*.mjs`, `scripts/*.mjs`).
   - Không tự ý phá vỡ khả năng chạy trực tiếp hoặc đổi đường dẫn file tĩnh đang được link chéo giữa các trang (`index.html`, `control.html`, `tonkhomakeup.html` -> `tonmakeup.html`, `off.html` <-> `mcform.html`, v.v.).
2. **Hệ thống Giao diện Dark Glassmorphism:**
   - Giữ ngôn ngữ thiết kế tối chuẩn dự án (`#050508`, `#070b14`, `#0b1329`) cùng các hiệu ứng từ `animate-kit/animate-kit.css` và `animate-kit/animate-kit.js` (chi tiết trong `docs/ANIMATE_UI_GUIDE.md`).
3. **CẤM TUYỆT ĐỐI Native Dialog (`alert()`, `confirm()`, `prompt()`):**
   - Mọi thông báo, xác nhận xóa/lưu và nhập liệu phải sử dụng custom glass modal/toast nội bộ (ví dụ `showGlassConfirm`, `#customInputModal`, `#leaveNoteModal`, v.v.).
4. **Hợp đồng Firebase Firestore & Storage (`passionstar-2014d`):**
   - Toàn bộ các module cloud đang dùng chung Firebase project `passionstar-2014d`.
   - Không đổi tên collection, document path, field schema, hay key `localStorage` / `sessionStorage` nếu không có logic migrate tương thích ngược. Mọi thao tác đọc field Firestore phải đảm bảo null-safety.
5. **Quy ước PIN Quản trị & Xác thực:**
   - PIN quản trị mặc định `'0908'` được áp dụng đồng nhất tại `idol_tracker.html` (`#mainPinLockOverlay`), `off.html` (`sessionStorage['ps_admin_auth']`), và `task_media.html` (`#managerPinModal` + `sessionStorage['media_manager_pin_verified']`).
   - Hệ thống 2FA/Account bảo vệ bằng SHA-256 auth hash (`VALID_AUTH_HASH`), Boss Key và QTSC (`2fa.html`, `scripts/2FA_Service.gs`).
6. **Bảo mật Secret (Anti-GH013):**
   - **Tuyệt đối không** viết raw token, API key, hay secret đã giải mã vào mã nguồn commit công khai, `spec.md`, `docs/SPEC.md` hoặc `docs/specs/*.spec.md` (bao gồm Apify tokens trong `APIFY_ACCOUNTS`, Gemini API key, GitHub `ghp_` token, Zalo `BOT_TOKEN`).
7. **Quy tắc Git Staging an toàn:**
   - Thư mục `Storyboard/` chứa file untracked dung lượng lớn — không dùng `git add -A`; chỉ stage đúng các file nguồn/tài liệu nằm trong phạm vi thay đổi.

---

## 2. Bảng Ánh Xạ Toàn Bộ File Trên Git -> Module Spec

Toàn bộ các file theo dõi trên Git (`git ls-files`) được ánh xạ đầy đủ vào **19 module spec** dưới `docs/specs/`:

| STT | Nhóm / Chức năng | Các file Git được ánh xạ | File Spec chi tiết |
| :-: | :--- | :--- | :--- |
| 1 | 2FA & Quản lý Tài khoản / OTP | `2fa.html` | `docs/specs/2fa.spec.md` |
| 2 | Smart Paste Tách Dữ Liệu | `smartpaste.html` | `docs/specs/smartpaste.spec.md` |
| 3 | Tạo & Quản lý Lời Chúc | `loichuc.html` | `docs/specs/loichuc.spec.md` |
| 4 | Dịch Thuật Tự Động AI | `ai_auto_translator.html` | `docs/specs/ai_auto_translator.spec.md` |
| 5 | Kích Hoạt Email Hàng Loạt | `mail_activator.html` | `docs/specs/mail_activator.spec.md` |
| 6 | Dashboard KPI Tổng Hợp | `dashboard.html` | `docs/specs/dashboard.spec.md` |
| 7 | Bảng Điều Khiển Trung Tâm | `control.html` | `docs/specs/control.spec.md` |
| 8 | Chấm Điểm Đánh Giá | `chamdiem.html` | `docs/specs/chamdiem.spec.md` |
| 9 | Hiệu Ứng Quà Tặng | `gift_lion_hell.html` | `docs/specs/gift_lion_hell.spec.md` |
| 10 | Cổng Quy Trình SOP | `sop.html` | `docs/specs/sop.spec.md` |
| 11 | Trang Chủ, Bàn Giao, Log & Animate Kit | `index.html`, `bbbangiao.html`, `log.html`, `animate-showcase.html`, `animate-kit/animate-kit.css`, `animate-kit/animate-kit.js` | `docs/specs/index_and_forms.spec.md` |
| 12 | Idol Media Tracker (TikTok KPI) | `idol_tracker.html` | `docs/specs/idol_tracker.spec.md` |
| 13 | Quản Lý Ngày Nghỉ & Form Đăng Ký | `off.html`, `mcform.html` | `docs/specs/off.spec.md` |
| 14 | Lịch Phân Công & Timeline Phòng | `timeline.html` | `docs/specs/timeline.spec.md` |
| 15 | Tồn Kho Makeup | `tonkhomakeup.html`, `data/tonkhomakeup_data.json` | `docs/specs/tonkhomakeup.spec.md` |
| 16 | Đề Xuất Mua Sắm Đồ Makeup | `tonmakeup.html` | `docs/specs/tonmakeup.spec.md` |
| 17 | Quản Lý Task & Lịch Team Media | `task_media.html` | `docs/specs/task_media.spec.md` |
| 18 | Backend Google Apps Script | `scripts/2FA_Service.gs`, `scripts/SyncDashboard.gs` | `docs/specs/backend_gas.spec.md` |
| 19 | Desktop App, API Proxy, Server, Scripts, Batch & Tests | `desktop/Passion2FA.cs`, `Passion2FA.exe`, `api/proxy.js`, `api/proxy-loichuc.js`, `api/auto-subscribe.js`, `server/server.mjs`, `server/auto_subscribe.mjs`, `.github/workflows/gemini-optimize.yml`, `scripts/ai-optimizer.mjs`, `scripts/setup_company_pc.ps1`, `scripts/kpi_dashboard/build_dashboard.ps1`, `scripts/kpi_dashboard/data_row_formats.json`, `scripts/kpi_dashboard/header_formats.json`, `bat/1_SYNC_TU_GIT_VE_MAY.bat`, `bat/2_SYNC_TU_MAY_LEN_GIT.bat`, `bat/start_2fa_app.bat`, `bat/start_lightpanda.bat`, `bat/start_mail_activator.bat`, `tests/lightpanda_runner.mjs`, `tests/pentest_2fa_ui.mjs`, `tests/pentest_idol_tracker.mjs`, `tests/pentest_mobile_all.mjs`, `tests/run_full_event_pentest.js`, `tests/run_smartpaste_pentest.js`, `manifest.json`, `icon/2fa.ico`, `icon/task_media.svg`, `icon/png/*.png`, `.gitignore`, `Hieuung.mp4`, `Hieuung_clean_final.mp4` | `docs/specs/scripts_and_tests.spec.md` |

> **Tài liệu & tài nguyên tĩnh khác trên Git:**
> - Hệ thống docs chuẩn: `docs/AGENTS.md`, `docs/GEMINI.md`, `docs/README.md`, `docs/PROGRESS.md`, `docs/SPEC.md`, `docs/ANIMATE_UI_GUIDE.md`, `docs/LIGHTPANDA_GUIDE.md`.
> - Tài nguyên media/icon/công cụ nội bộ: `img/`, `icon/`, `tests/screenshots/`, `.agents/`, `temp_frames/`.

---

## 3. Tóm Tắt Chức Năng Cốt Lõi & Điểm Chống Miss Theo Từng Module

> [!TIP]
> Mục này giúp rà soát nhanh khi cần sửa code. Trước khi code thực tế, **bắt buộc** mở file `.spec.md` chi tiết tương ứng trong `docs/specs/`.

### 3.1. `2fa.html` — `docs/specs/2fa.spec.md`
- Giao diện quản lý tài khoản, lấy mã 2FA TOTP và trích xuất Gmail OTP phối hợp với `scripts/2FA_Service.gs` (qua `/api/proxy` GET-first -> POST fallback hoặc JSONP).
- Hệ thống Cảnh báo Khẩn Cấp Thiết bị `[TẠM]` liên sheet (`passion_temp_device_alarms` + migrate từ `prime_radiant_alarms`, đồng bộ 2 chiều Firestore `2fa_cache/temp_device_alarms`, banner `#tempDeviceUrgentBanner`, toast `.alarm-toast`, âm báo Web Audio, gỡ nhanh `quickRemoveTempDevice`).
- Chế độ Passion 2FA Desktop App (`?desktop=1`) với cụm điều khiển `#desktopAppControls` / `#mobileDesktopAppControls`, cầu nối 2 chiều `/api/desktop/*` và đồng bộ Boss Key (`setBossKeyState`).
- Giữ nguyên cơ chế xác thực SHA-256 (`VALID_AUTH_HASH`), Stealth Pass, Auto-lock, Boss Key, QTSC và checklist chi tiết trong `docs/specs/2fa.spec.md`.

### 3.2. `smartpaste.html` — `docs/specs/smartpaste.spec.md` (75 dòng)
- Công cụ xử lý, phân tách và chuẩn hóa dữ liệu dán nhanh phục vụ nhập liệu vận hành.
- Bảo toàn regex parser, định dạng xuất và checklist kiểm thử trong `docs/specs/smartpaste.spec.md` (kết hợp suite `tests/run_smartpaste_pentest.js`).

### 3.3. `loichuc.html` — `docs/specs/loichuc.spec.md` (87 dòng)
- Module quản lý và tạo nội dung lời chúc, giao tiếp qua Vercel proxy `api/proxy-loichuc.js`.
- Bảo toàn luồng render, biến mẫu và checklist kiểm thử trong `docs/specs/loichuc.spec.md`.

### 3.4. `ai_auto_translator.html` — `docs/specs/ai_auto_translator.spec.md` (77 dòng)
- Module dịch thuật tự động bằng AI hỗ trợ thao tác nhanh song ngữ cho đội vận hành.
- Bảo toàn luồng gọi API, prompt/format dữ liệu và quy tắc UI trong `docs/specs/ai_auto_translator.spec.md`.

### 3.5. `mail_activator.html` — `docs/specs/mail_activator.spec.md` (69 dòng)
- Công cụ hỗ trợ kích hoạt và theo dõi trạng thái email hàng loạt, liên thông với `api/auto-subscribe.js`, `server/auto_subscribe.mjs`, và `bat/start_mail_activator.bat`.
- Bảo toàn trạng thái batch, cấu hình endpoint và checklist trong `docs/specs/mail_activator.spec.md`.

### 3.6. `dashboard.html` — `docs/specs/dashboard.spec.md` (63 dòng)
- Màn hình Dashboard tổng hợp chỉ số KPI và dữ liệu vận hành theo team.
- Bảo toàn nguồn dữ liệu đồng bộ, cấu trúc bảng/thẻ và checklist tại `docs/specs/dashboard.spec.md`.

### 3.7. `control.html` — `docs/specs/control.spec.md` (58 dòng)
- Trung tâm điều khiển, điều hướng nhanh và kiểm soát vận hành các module công cụ.
- Bảo toàn liên kết module, quyền hiển thị và checklist tại `docs/specs/control.spec.md`.

### 3.8. `chamdiem.html` — `docs/specs/chamdiem.spec.md` (68 dòng)
- Công cụ chấm điểm đánh giá nhân sự/hiệu suất theo bộ tiêu chí chuẩn hóa.
- Bảo toàn công thức chấm điểm, trọng số, lưu trạng thái và checklist tại `docs/specs/chamdiem.spec.md`.

### 3.9. `gift_lion_hell.html` — `docs/specs/gift_lion_hell.spec.md` (62 dòng)
- Module xử lý/hiển thị quà tặng và hiệu ứng sự kiện (`gift_lion_hell`).
- Bảo toàn cấu hình hiệu ứng, dữ liệu quà tặng và checklist tại `docs/specs/gift_lion_hell.spec.md`.

### 3.10. `sop.html` — `docs/specs/sop.spec.md` (52 dòng)
- Cổng tra cứu quy trình vận hành chuẩn (SOP) nội bộ công ty.
- Bảo toàn cấu trúc mục SOP, bộ lọc/tìm kiếm và checklist tại `docs/specs/sop.spec.md`.

### 3.11. `index.html`, `bbbangiao.html`, `log.html`, `animate-showcase.html`, `animate-kit/*` — `docs/specs/index_and_forms.spec.md` (78 dòng)
- Nhóm trang cổng điều hướng (`index.html`), biểu mẫu bàn giao (`bbbangiao.html`), trang log (`log.html`) và hệ thống animation UI (`animate-kit/animate-kit.css`, `animate-kit/animate-kit.js`, `animate-showcase.html`).
- Bảo toàn toàn bộ đường dẫn thẻ điều hướng, hiệu ứng UI chuẩn và các trường biểu mẫu trong `docs/specs/index_and_forms.spec.md`.

### 3.12. `idol_tracker.html` — `docs/specs/idol_tracker.spec.md`
- **Phân quyền:** 2 chế độ khóa: Admin PIN `'0908'` (`#mainPinLockOverlay`) và link theo nhóm `?group=` (`#groupPinLockOverlay` với `DEFAULT_GROUP_CODES`: `ANGELIK88`, `FASHION88`, `ROYEN88`, `BNART88`, `BEE88`, `ORION88`).
- **Firestore (`passionstar-2014d`):** `artifacts/passion-media-tracker/public/data/{accounts,posts,settings/group_aliases}`, khởi tạo 43 tài khoản mặc định.
- **Logic cốt lõi không được thiếu:**
  - Validate chéo nhóm và định danh handle trong `handlePostSubmit`; chống XSS & chuẩn hóa link bằng `escapeHtml`, `safeTikTokHref`.
  - Tính tiến độ tuần `getAccountWeeklyProgress`: khử trùng bài đăng, hỗ trợ bỏ qua tuần `bypassedWeeks` (`ps_bypass_weeks_map`) và KPI động theo tuần (`ps_kpi_<week>`).
  - Chế độ Kênh Riêng Tư (`ps_private_accounts_map` + Firestore `isPrivate`/`privateNote`, tự skip khi scan nhóm) và lịch sử tuần bắt đầu hiệu lực / chuyển nhóm (`ps_account_schedules_map`, `startWeek`, `groupHistory`, `isAccountActiveInWeek`).
  - Làm sạch ký tự tiếng Trung trong text tiếng Việt bằng `sanitizeVietnameseText`.
  - Quét video TikTok qua Apify Actor `0FXVyOXXEmdGcV88a` xoay vòng 3 tài khoản trong `APIFY_ACCOUNTS` (`tinoo8386`, `viewable_org`, `virtuosic_gimlet`, `CHUNK_SIZE = 6`), fallback sang TikWM + giải mã timestamp Snowflake (`BigInt >> 32n`).
  - Xuất báo cáo Excel `PASSION_MEDIA_TIEN_DO_TUAN_<YYYYMMDD>.xlsx` và copy HTML/TSV cho Google Sheets; phím tắt `C`, `S`/`K`, `D`, `N`, `G`, `?`, `/`.

### 3.13. `off.html` & `mcform.html` — `docs/specs/off.spec.md`
- **Firestore (`passionstar-2014d`) & GAS:** `off_employees`, `off_month_employees/{YYYY-MM}`, `off_leaves/{safeName}_{YYYY-MM-DD}`, `off_groups`, `system_config/general` kết nối GAS `AKfycbxXGOJkbgCgmBl1QxQ4qbJVIIp1fz_yJglRPLLNiG3DLdZJjJCs0Bpmpwn4LfEz7AR5/exec`.
- **`off.html`:** PIN `'0908'` (`sessionStorage['ps_admin_auth']`, dọn `localStorage` cũ), thông báo desktop/âm thanh realtime `initRealtimeLeaveNotifications` trên `off_leaves`, nhóm Traffic (`ORION`, `ROYEN:ONE`), hàng đợi chỉnh sửa `draftQueue` + `saveBulkChanges`, chế độ nhanh `ps_quick_leave_mode`, kéo-thả đổi ngày, `approveAll`, Flatpickr + `html2canvas` xuất PNG (`executeCustomExport`, modal iOS `#iosImagePreviewModal`), custom modal `#customInputModal` & `#leaveNoteModal`.
- **`mcform.html`:** Mở theo ngữ cảnh `?group=GROUP:...` hoặc `PERSON:...`, tự động chuyển giao diện lịch vuông khi xem 1 nhân sự, hỗ trợ chọn nhiều ngày áp dụng (`executeMultipleLeaves`) và hủy hàng loạt (`executeMultipleCancels`).

### 3.14. `timeline.html` — `docs/specs/timeline.spec.md`
- **Firebase v10.8.1 (`passionstar-2014d`) & GAS:** Đọc/ghi `system_config/timeline_event`, `system_config/timeline_daily`, `timeline_teams/{name}`; đọc chéo `off_employees`, `off_leaves`, `off_groups`, `system_config/general`; đồng bộ GAS `AKfycbzcmLF9VvArtI_mp2hcCZnXXtgOOGUpDOZDe57pWfFCMJzU_jR7D7Qj99GJ7qTGDFy9qA/exec`.
- **`localStorage`:** `ps_timeline_event_data`, `ps_timeline_daily_data`, `ps_timeline_active_tab`, `ps_timeline_global_headers`, và `ROOM_DEFAULT_MIGRATION_KEY`.
- **Logic cốt lõi:** Đồng bộ 2 chiều theo `lastUpdated` (debounce 1500ms); bảo toàn `makeupStart` và giá trị mặc định non-zero (`duration = 40`, `liveDelay = 5` từ `DEFAULT_DAILY_TEAMS`); `isTeamOffOnDate` loại trừ các nhóm `TEACHER`, `MANAGER`, `MEDIA`, `ACCOUNTANT`, `HR` và trường hợp `swapFrom`, trong khi nhóm Traffic luôn hoạt động; `cycleTeamCalcMode` (`auto`/`same`/`next`); kéo-thả sự kiện liên phòng; modal `#ps-edit-team-name-modal` (`#psCloseTeamModalBtn`), `showGlassConfirm`; xuất HD PNG, Clipboard và PDF 1 trang A4 (`jsPDF` qua `captureAndDownloadPDF`).

### 3.15. `tonkhomakeup.html` & `data/tonkhomakeup_data.json` — `docs/specs/tonkhomakeup.spec.md`
- **Firebase v11.6.1 (`passionstar-2014d`) & Sheets:** `artifacts/passionstar-makeup-sheet1/public/data/{makeup_inventory,makeup_inventory_tx,makeup_inventory_settings/config}` và `settings_categories`; đồng bộ Google Sheets Gviz JSONP + seed fallback 42 món.
- **`localStorage`:** `makeup_inv_initialized_v2`, `makeup_inventory_cache_v1`, `makeup_inventory_tx_cache_v1`, `makeup_inv_categories_v1`, `makeup_inv_col_widths_v8`, `makeup_low_stock_transfer`, `makeup_inventory_view_mode`.
- **Logic cốt lõi:** Tính tồn kho tự động `recalculateItemStockFromHistory` (`initStockOriginal + dailyInbound - dailyUsage`), nhập/xuất kèm ảnh bằng chứng nén (`#outbound-modal` chặn xuất quá tồn), Smart Paste (`parseSmartItemList`), CRUD danh mục, dịch VI -> ZH (`translate.googleapis.com`), đẩy danh sách sắp hết sang trang đề xuất (`confirmNavigateToProposal` -> `tonmakeup.html`), xuất CSV (`exportInventoryCSV`).

### 3.16. `tonmakeup.html` — `docs/specs/tonmakeup.spec.md`
- **Firebase v11.6.1 (`passionstar-2014d`):** `artifacts/passionstar-makeup-sheet1/public/data/{makeup_products,makeup_settings/config}`.
- **Logic cốt lõi:** Quản lý đề xuất đồ makeup theo tháng (`copyFromPreviousMonth`, đồng bộ tỷ giá VNĐ/CNY `exchangeRate`), resize độ rộng cột chỉ lưu local (`STORAGE_COL_WIDTHS_KEY`), backup `makeup_products_backup_v1`, `makeup_view_mode_proposal`, tự động dịch `autoTranslateToChinese` (debounce 300ms), import Sheet/Excel `.xlsx`/`.csv` kèm gán ảnh nén hàng loạt (`append`/`replace`), Smart Paste, modal upload/link nhanh theo từng dòng, xuất song ngữ VI/ZH & CSV `DE_XUAT_DO_MAKE_UP_<YYYY_MM>.csv`.

### 3.17. `task_media.html` — `docs/specs/task_media.spec.md`
- **Phân quyền:** Quản lý dùng PIN `'0908'` (`sessionStorage['media_manager_pin_verified']`, `#managerPinModal`) và chế độ nhân sự bị khóa theo URL `?staff=` / `?role=media` (`applyRoleVisibility`, `#linksModal` quản lý link cá nhân).
- **Firestore & Storage:** `media_tasks`, `media_settings/config` (`staffList` mặc định `['Mỹ', 'Anh Quý']`, `customCategories`); `localStorage` gồm `media_tasks_cache_v2`, `media_timeline_submode`, `media_lang_pref`, `media_quick_staff`.
- **Logic cốt lõi:** Quy trình duyệt xóa 2 bước (`deleteRequested`, `renderManagerApprovalBanner`), đổi ngôn ngữ VI/ZH 100% (`I18N`), chế độ xem `agenda`/`staff`/`week` + `renderClassicShiftView` + `renderFloatingCalendarGrid` + `renderAnalyticsReportView` + iOS wheel picker + xuất CSV `Media_Schedule_<LANG>_<DATE>.csv`.

### 3.18. Google Apps Script Backend (`scripts/2FA_Service.gs`, `scripts/SyncDashboard.gs`) — `docs/specs/backend_gas.spec.md`
- **`scripts/2FA_Service.gs`:** Phục vụ Google Spreadsheet `1YzG8IsQnJ8sKMovRxj2XmL3Xb7SU9SByjTHET6eYk1w` (các sheet `Tkhoan`, `Config`, `Device_Logs`), xác thực SHA-256 `VALID_AUTH_HASH`, xử lý đồng bộ GET/POST (`doGet`, `doPost`, `handleAppScriptRequest`), đọc bảng động (`getSheetData`), cập nhật thiết bị (`updateDeviceToMasterSheet`, `getConfigDevices`, `logDeviceAction`), đọc Gmail OTP (`getEmailVerificationCode`), kiểm tra forward (`checkEmailForwardStatus`), lưu rộng cột (`saveColumnWidths`, `getColumnWidths`).
- **`scripts/SyncDashboard.gs`:** Tự động hóa `KPI_DASHBOARD`: menu `"⭐ KPI PASSION STAR"`, trigger `onEdit` (đổi ô `B1` sang tháng mới -> lưu trữ Paste Values + clone sheet `DATA`; sửa cột `F`/`G` -> đồng bộ `_KPI_TARGET_DB`), `TEAM_ANCHORS` cho 6 team (`FASHION`, `ROYEN:ONE`, `ELRIS`, `ANGELIK`, `MIRACLE`, `ORION`), `scanAllTeamsDynamic`, `dongBoDashboardChuanDep`, `chuyenSangThangMoiTuDong`.

### 3.19. Desktop App, API Proxy, Server, Scripts, Batch & Pentest — `docs/specs/scripts_and_tests.spec.md`
- **Desktop App & Launcher:** `desktop/Passion2FA.cs`, `Passion2FA.exe`, `bat/start_2fa_app.bat` (C# WinForms single-instance `Local\PassionStar_2FA_Desktop_Wakeup_Event`, tự chạy `server/server.mjs` + `?desktop=1`, hotkey `Alt+Shift+A/T/B/L`, TopMost Win32, `NotifyIcon`).
- **Vercel API & Local Server:** `api/proxy.js` (ưu tiên `GET ?req=...` `<= 3500` chars rồi fallback `POST`, chống double-stringify), `api/proxy-loichuc.js`, `api/auto-subscribe.js`, `server/server.mjs` (Static + `POST /api/proxy` + `POST /api/auto-subscribe` + Desktop Bridge `/api/desktop/{health,state,poll-native,poll-web,command,native-event}`), `server/auto_subscribe.mjs`.
- **Automation, Dashboard Builder, Batch & Tests:** `.github/workflows/gemini-optimize.yml` + `scripts/ai-optimizer.mjs`, `scripts/setup_company_pc.ps1`, `scripts/kpi_dashboard/{build_dashboard.ps1,data_row_formats.json,header_formats.json}`, `bat/{1_SYNC_TU_GIT_VE_MAY,2_SYNC_TU_MAY_LEN_GIT,start_2fa_app,start_lightpanda,start_mail_activator}.bat`, `tests/{lightpanda_runner.mjs,pentest_2fa_ui.mjs,pentest_idol_tracker.mjs,pentest_mobile_all.mjs,run_full_event_pentest.js,run_smartpaste_pentest.js}`, `manifest.json`, `icon/*`, `.gitignore`, `Hieuung.mp4`, `Hieuung_clean_final.mp4`.
