# Đặc tả kỹ thuật — `idol_tracker.html` (Passion Media — Quản Lý Kênh Idol & Nhóm TikTok)

- **File nguồn:** `idol_tracker.html` (~12,812 dòng, Vanilla HTML/Tailwind/JS + Chart.js + SheetJS `xlsx` + Firebase 11.6.1 Firestore/Auth)
- **Mục đích:** Hệ thống theo dõi tiến độ đăng bài TikTok hàng tuần của các kênh nhóm & idol cá nhân (Angelik, Fashion, Royen:One, Bnart, BEE, Orion, v.v.), tự động dò video qua **Apify TikTok Scraper** (3 tài khoản xoay vòng) và fallback TikWM/Snowflake, tính KPI tuần, xuất báo cáo Google Sheets / Excel / Zalo / Telegram và cấp link vận hành riêng theo nhóm (`?group=<GroupName>`).

---

## 1. Kiến trúc bảo mật & Phân quyền 2 lớp

1. **Link chính (Admin View — không có `?group=`):**
   - Khóa toàn màn hình bởi `#mainPinLockOverlay` với `document.documentElement.classList.add('auth-locked')` cho tới khi nhập đúng `ADMIN_SECURITY_PIN = '0908'`.
   - Có quyền toàn cục: xem/chỉnh tất cả nhóm, cấu hình KPI tuần, đổi tên nhóm theo hiệu lực tuần, bật/tắt Bypass KPI, sửa/xóa tài khoản, quản lý & cấp mã code bảo mật từng nhóm (`#groupCodesModal`, `#groupSingleShareModal`), xuất Google Sheets & dò bài hàng loạt.
2. **Link vận hành riêng từng nhóm (`?group=<GroupName>`):**
   - Kiểm tra qua `isGroupOperatorLink()`. Khóa bởi `#groupPinLockOverlay` (`showGroupPinLockOverlay(grpName)`).
   - Xác thực bằng mã code riêng theo nhóm trong `DEFAULT_GROUP_CODES` (`Angelik: ANGELIK88`, `Fashion: FASHION88`, `Royen:One: ROYEN88`, `Bnart: BNART88`, `BEE: BEE88`, `Orion: ORION88`, fallback `<GROUP>88`) lưu tại `localStorage['ps_group_codes']` và session `sessionStorage['ps_group_auth_<cleanId>']`.
   - **Rào chắn bảo mật bài đăng trong `handlePostSubmit()`:**
     - Chặn lưu nếu link TikTok thuộc tài khoản ngoài hệ thống (`!accounts.find(...)`).
     - Khi đang ở `currentOperatorGroup`, chặn tuyệt đối việc chọn kênh hoặc dán link TikTok thuộc nhóm khác (`extractCleanGroupName(targetAcc).toUpperCase() !== currentOperatorGroup.toUpperCase()`).
     - Kiểm tra "đúng Idol đúng ID": handle trong URL phải khớp `handle` hoặc `subHandle` của `accountId` đang chọn (`isHandleMatchAccount`).

---

## 2. Dữ liệu Firebase, Seed mặc định & `localStorage`

- **Firebase Project:** `passionstar-2014d`, namespace `appId = 'passion-media-tracker'`.
- **Firestore Collections / Documents:**
  - `artifacts/passion-media-tracker/public/data/accounts/{accId}`: Hồ sơ 43 tài khoản mặc định across 6 `GROUP_THEMES` (`Angelik` gồm 5 idol + `@angelik_276`, `Fashion` `@novarch_here`, `Royen:One` `@royen.one_here`, `Bnart` `@bnart.foryou`, `BEE` `@psbee.official`, `Orion` `@orion.here`, cùng các idol con). Hỗ trợ `handle`, `subHandle`, `role` (`'GROUP' | 'IDOL'`), `groupHistory` (chuyển nhóm có hiệu lực theo tuần), `bypassedWeeks` (object theo `weekMonday`).
  - `artifacts/passion-media-tracker/public/data/posts/{postId}`: Bài đăng (`weekMonday`, `date`, `accountId`, `category`, `link`, `status` `'ĐÃ ĐĂNG'` / hẹn lịch, `note`, `sheet`, `updatedAt`).
  - `artifacts/passion-media-tracker/public/data/settings/group_aliases`: Lưu lịch sử đổi tên hiển thị nhóm có hiệu lực từ mốc tuần (`groupAliases[rawGroupName][effWeek] = newName`).
- **`localStorage` & `sessionStorage` Keys:**
  - `ps_theme`: Light/Dark mode (`D` shortcut).
  - `ps_group_aliases`: Cache bản đồ đổi tên nhóm theo tuần.
  - `ps_group_codes`: Bảng mã bảo mật nhóm.
  - `ps_bypass_weeks_map`: Cache cấu hình miễn/bypass KPI theo từng `accId` & từng tuần (`acc.bypassedWeeks`).
  - `ps_kpi_<weekMonday>` & `ps_kpi_default`: Chỉ tiêu bài/tuần theo từng tuần (mặc định `group: 1`, `idol: 2`).
  - `apify_active_account_index`: Chỉ số tài khoản Apify đang dùng (`0..2`).
  - `ps_apify_quota_cache`: Cache dung lượng credit Apify từng tài khoản.
  - `sessionStorage['ps_group_auth_<cleanId>']`: Phiên đã mở khóa cho link nhóm.

---

## 3. Logic nghiệp vụ cốt lõi (KPI, Tuần, Alias, Bypass & Làm sạch dữ liệu)

1. **Tính KPI tuần (`getAccountWeeklyProgress(accId, weekMondayStr)`):**
   - Lọc bài đăng của `accId` trong `targetWeek`, sort tăng dần theo `(date, createdAt)`.
   - **Khử đếm trùng bài `ĐÃ ĐĂNG`:** Tạo key ưu tiên `vid:<videoId>` -> `url:<cleanUrl>` -> `id:<post.id>` bằng `Set` để không tính 1 video hai lần.
   - Đọc `targetKpi` từ `getAccountTargetKpi(accId, targetWeek)` (`ps_kpi_<week>` fallback `ps_kpi_default`: `group: 1`, `idol: 2`).
   - Kiểm tra **Bypass KPI độc lập theo tuần** (`isAccountBypassedForWeek(acc, targetWeek)` đọc `acc.bypassedWeeks[targetWeek]`, đồng thời xóa bỏ cờ global cũ `acc.isBypassed = false` trong `handleBypassFormSubmit` để tránh dính sang tuần sau).
   - Trả về `postedCount`, `scheduledCount`, `totalCount`, `isBypassed`, `bypassReason`, `isDonePosted`, `isDoneTotal`, `missingPosted`, `missingTotal`, `isWeekExpired` (`isWeekOverdueOrExpired`), `isPenalized` (`!isBypassed && isWeekExpired && postedCount < targetKpi`).
2. **Đổi tên nhóm & Chuyển nhóm theo mốc thời gian:**
   - `getGroupNameForDisplay(rawGroupName, targetWeek)`: Tìm `effWeek <= weekMon` lớn nhất trong `groupAliases[rawGroupName]` để giữ lịch sử tuần cũ không bị đổi tên sai.
   - `extractCleanGroupName(acc, targetWeek)`: Ưu tiên kiểm tra `acc.groupHistory` theo mốc `effWeek <= weekMon` trước khi trả về nhóm hiện tại.
   - `populateEffectiveWeeks()` tạo lựa chọn tuần áp dụng (`ALL`, tuần hiện tại, tuần sau, +2 tuần).
3. **Làm sạch văn bản Hán tự & Khử trùng bài đăng:**
   - `sanitizeVietnameseText(rawStr)` & `cleanPostLanguage(post)`: Chuyển đổi tên sheet kiểu `10月份-W3` -> `Tháng 10 - Tuần 3` và lọc sạch ký tự `[\u4e00-\u9fff]+` sót từ dữ liệu/Excel cũ.
   - `initFirebaseAndSync()`: Tự động dọn các trạng thái scan lỗi cũ (`ERROR`, `PRIVATE`) khỏi Firestore và sửa handle cho `idol_christ` (`@christ._life` / `@pstnnkij6i3`).
   - `cleanupDuplicatePostsManual()`: Gộp bài nhập tay/Excel chưa có link với bài `scan_...` cùng tuần & tài khoản, sau đó chạy `deduplicatePostsArray` và xóa document thừa trên Firestore.

---

## 4. Tự động dò bài TikTok (Apify 3-Account Rotation & TikWM / Snowflake)

1. **Dò link đơn khi nhập tay (`parseAndResolveTikTokLink`, `analyzePostLinkInput`):**
   - Hỗ trợ làm sạch đoạn text copy nhiều dòng từ app TikTok điện thoại.
   - Phát hiện short-link `vt.tiktok.com` / `vm.tiktok.com` -> gọi `tikwm.com` phân giải URL gốc + `create_time`, fallback `decodeTikTokSnowflakeTimestamp(videoIdStr)` bằng dịch bit `BigInt >> 32n` để suy ra timestamp & ngày đăng chính xác.
2. **Quét kênh hàng loạt & đơn lẻ bằng Apify (`fetchTikTokFeedFromApify`, `startApifyScan`, `scanSingleAccountApify`):**
   - Dùng `APIFY_ACCOUNTS` gồm **3 tài khoản xoay vòng** (`Acc 1 (tinoo8386)`, `Acc 2 (viewable_org)`, `Acc 3 (virtuosic_gimlet)` — token bảo mật lưu dạng encoded nội bộ, tuyệt đối không trích xuất token thô vào tài liệu).
   - Gọi Actor `https://api.apify.com/v2/acts/0FXVyOXXEmdGcV88a/run-sync-get-dataset-items` (tắt download video/cover/subtitle/avatar để tiết kiệm credit).
   - Khi HTTP `402 / 403 / 429` hoặc message chứa `quota|credit|usage|limit|rate|exceeded|compute` (hoặc lỗi mạng), `rotateToNextApifyAccount()` tự chuyển sang tài khoản kế tiếp và thử tối đa `APIFY_ACCOUNTS.length` lần.
   - `startApifyScan(scope)` hỗ trợ quét `MISSING` (các kênh chưa đủ KPI & chưa bypass), `GROUP` (1 nhóm), hoặc toàn bộ hệ thống; chia lô `CHUNK_SIZE = 6` kênh chạy song song, hỗ trợ nút Dừng (`stopApifyScanRequested`), có singleton guard `apifyScanManager`.
   - `ingestApifyDiscoveredPosts()`: Chỉ nhận bài thuộc `targetWeekMonday`; phân loại `Ảnh (Photo Mode)` (`isSlideshow` hoặc `mediaUrls.length > 0`) vs `Video / Clip`; ưu tiên gộp vào bài trống chưa có link (`findUnlinkedPostToMerge`) trước khi tạo bài mới ID `apify_<accId>_<videoId>`.
   - `fetchApifyAccountQuota()` truy vấn `/v2/users/me/usage/monthly` và `/v2/users/me` để hiển thị mức credit đã dùng (`$`) trong modal Apify.
   - `legacyScanSingleAccount()`: Fallback cũ qua `fetchTikTokChannelFeed` (TikWM), phân biệt `RATE_LIMIT` (chỉ ghi `addScanLogEntry`, không gắn nhãn lỗi lên card Firebase) và `PRIVATE`.

---

## 5. Nhập/Xuất dữ liệu, Báo cáo & Phím tắt UI

1. **Modal hệ thống (16 modal/overlay chính):**
   - `#mainPinLockOverlay`, `#groupPinLockOverlay`, `#groupCodesModal`, `#groupSingleShareModal`
   - `#idolDetailModal` (thêm/sửa bài đăng), `#smartPasteConfirmModal`, `#accountModal`, `#confirmDeleteAccountModal`, `#bypassAccountModal`
   - `#apifyScanModal`, `#apifyProgressCheckModal`, `#exportSheetModal`, `#googleSheetModal`, `#lastWeekReportModal`, `#keyboardShortcutsModal`, `#cloudHelpModal`.
2. **Xuất báo cáo:**
   - `downloadFullExcelFile()` (cũng được `exportToCSV()` gọi): Xuất file `PASSION_MEDIA_TIEN_DO_TUAN_<YYYYMMDD>.xlsx` gồm 2 sheet: `TIEN_DO_DANG_BAI` (bảng song ngữ + merge dòng chuẩn từ `buildGoogleSheetsExportHtml`) và `CHI_TIET_BAI_DANG`. Hỗ trợ checkbox `#sheetSeparateGroupCol` (tách cột Nhóm riêng).
   - `copyTableForGoogleSheets()`: Ghi đồng thời `text/html` và `text/plain` TSV vào Clipboard (fallback `document.execCommand('copy')`) để dán trực tiếp vào Google Sheets giữ nguyên định dạng merge ô.
   - `copyCurrentOperatorGroupReport()` / `copyGroupKpiReport()` & `generateNewWeekAnnouncementText()`: Tạo tin nhắn báo cáo KPI gửi nhóm và thông báo đầu tuần (Thứ 2 -> Chủ Nhật, nêu rõ bài hợp lệ vs bài poster PK/sự kiện không tính KPI).
3. **Phím tắt toàn cục (khi không focus `INPUT/TEXTAREA/SELECT`):**
   - `C`: Copy báo cáo KPI nhóm hiện tại.
   - `S` hoặc `K`: Bật/tắt thanh KPI Sidebar (`toggleKpiSidebar`).
   - `D`: Chuyển theme Sáng/Tối (`toggleTheme`).
   - `N`: Mở modal thêm bài đăng mới (`openIdolDetailModal`).
   - `G`: Mở modal xuất Google Sheets (`openGoogleSheetModal`).
   - `?`: Mở bảng hướng dẫn phím tắt.
   - `/`: Focus nhanh ô tìm kiếm (`#directorySearch` / `#filterSearch`).

---

## 5.5. Kênh Riêng Tư (Private Account), Tuần Hiệu Lực (`startWeek` / `groupHistory`) & Bảo Mật XSS

1. **Chế độ Kênh Riêng Tư (`Private Account Mode`):**
   - Lưu mapping localStorage `ps_private_accounts_map` (`PRIVATE_ACCOUNTS_STORAGE_KEY`) và đồng bộ 2 chiều các field `isPrivate`, `privateNote` lên Firestore `artifacts/passion-media-tracker/public/data/accounts/{id}`.
   - Hàm xử lý: `loadPrivateAccountsMap`, `savePrivateAccountState`, `hydrateAccountsPrivateState`, `isAccountPrivate`, `toggleAccountPrivate`, `toggleAccountPrivateFromModal`, `toggleAccountFormPrivateNote`.
   - Giao diện & hành vi: Checkbox `#accIsPrivate`, vùng ghi chú `#accPrivateNoteWrapper` / `#accPrivateNote`, tab lọc `#dirTabPrivate`, cụm nút/banner trong modal chi tiết `#idolModalPrivateBtn`, `#idolModalPrivateBanner`, `#idolModalPrivateNoteText`, `#idolModalPrivateOpenLink`. Khi quét TikTok hàng loạt theo nhóm, các kênh đang bật `isAccountPrivate(acc)` được tự động bỏ qua và thống kê qua `privateSkipped`.
2. **Tuần Bắt Đầu Hiệu Lực & Lịch Sử Nhóm Theo Tuần (`startWeek` & `groupHistory`):**
   - Lưu localStorage `ps_account_schedules_map` (`ACCOUNT_SCHEDULES_STORAGE_KEY`).
   - Hàm xử lý: `getActiveWeekMonday`, `inferAccountStartWeek`, `isAccountActiveInWeek`, `getAccountsForWeek`, `getUniqueGroupNames`, `saveAccountScheduleState`, `hydrateAccountScheduleState`, `populateEffectiveWeeks`. Chỉ hiển thị và tính KPI cho tài khoản đã tới tuần hiệu lực (`isAccountActiveInWeek`).
3. **Bảo mật XSS & Chuẩn hóa Link:** Dùng `escapeHtml(rawStr)` và `safeTikTokHref(rawUrl, fallbackHandle)` cho toàn bộ render thẻ/modal và liên kết TikTok.

---

## 6. Checklist chống bỏ sót khi sửa/viết lại code

- [ ] Giữ nguyên khóa PIN Admin `'0908'` cho link chính và mã code riêng theo nhóm cho `?group=`; không cho operator nhóm A lưu/chỉnh bài hoặc chọn kênh nhóm B.
- [ ] Không sửa cấu trúc Firestore `artifacts/passion-media-tracker/public/data/{accounts,posts,settings}` hoặc bỏ danh sách 43 `DEFAULT_ACCOUNTS`.
- [ ] Bypass KPI phải ghi vào `acc.bypassedWeeks[targetWeek]` (và `ps_bypass_weeks_map`), luôn đặt `acc.isBypassed = false` toàn cục để không lan sang tuần khác.
- [ ] Bảo toàn trạng thái Kênh Riêng Tư (`ps_private_accounts_map` + Firestore `isPrivate`/`privateNote`, tự động skip khi scan nhóm) và lịch sử tuần hiệu lực (`ps_account_schedules_map`, `startWeek`, `groupHistory`).
- [ ] Giữ escape chống XSS (`escapeHtml`, `safeTikTokHref`), logic khử trùng bài đăng trong `getAccountWeeklyProgress` (theo `videoId` -> `cleanUrl` -> `id`) và Apify rotation 3 account + `CHUNK_SIZE = 6`.
- [ ] Không dùng `alert`/`confirm`/`prompt` native; mọi thông báo qua `showToast` / custom modal.
- [ ] Tuyệt đối không hardcode/commit raw Apify token mới dạng plaintext lên Git ngoài cơ chế hiện có (hoặc tốt nhất chuyển proxy).
