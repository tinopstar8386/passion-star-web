# Đặc tả Kỹ thuật Module: TikTok VIP Gift Effect - Hell Lion (`gift_lion_hell.html`)

- **File chính:** `gift_lion_hell.html` (1,158 dòng)
- **Tài nguyên hình ảnh phụ thuộc:** `img/hell_lion_1.jpg`, `img/hell_lion_2.jpg`
- **Mục đích:** Trình mô phỏng và xuất video `.webm` trong suốt (VP9 Alpha Channel, 60 FPS, 8 Mbps) hiệu ứng quà tặng VIP TikTok **Sư Tử Địa Ngục (Hell Lion)** để chèn trực tiếp vào OBS Studio, CapCut hoặc Premiere.

---

## 1. Mục tiêu & Tổng quan Kiến trúc

`gift_lion_hell.html` là ứng dụng đồ họa Canvas 2D + Web Audio API chạy thuần phía client (không cần backend), dựng hoạt ảnh dài `DURATION = 5000` ms (5 giây) trên canvas độ phân giải dọc `W = 720, H = 1080` chuẩn livestream TikTok.

---

## 2. Cấu hình, Chế độ Xem trước & Tương tác UI

- **3 Mẫu Sư Tử (`switchLionModel`, `#lionModelSelect`):**
  - `cinematic1` (mặc định): dùng ảnh `img/hell_lion_1.jpg` (chính diện cực đại).
  - `cinematic2`: dùng ảnh `img/hell_lion_2.jpg` (góc nghiêng vồ mồi).
  - `procedural`: Sư tử lửa hoạt họa vẽ vector hoàn toàn bằng Canvas (`drawHellLion`, `drawClaw`, `drawHorn`, `drawEye`).
- **Tách nền đen ảnh tĩnh tự động (`prepareKeyedSprite`):**
  - Dùng Canvas ẩn (`offCanvas`) đọc `getImageData` và xóa nền đen theo ngưỡng luminance (`maxVal < 18` -> `alpha = 0`; `18..70` -> làm mịn alpha chuyển tiếp). Có try/catch fallback sang thẻ `Image` gốc nếu mở qua giao thức `file://` bị chặn CORS `getImageData`.
- **3 Chế độ nền xem trước (`setBgMode`):**
  - `mock` (Phòng Live): hiện khung giả lập `.bg-livemock` + `#mockHud` (canvas vẫn trong suốt).
  - `checkered` (Trong Suốt Alpha): nền ô ca-rô.
  - `green` (Phông Xanh Chroma): tô đặc nền `#00ff00` trực tiếp lên Canvas ở mỗi frame (xuất được video phông xanh).
- **Thông tin Banner Quà tặng (`drawGiftBanner`):**
  - `#senderName` (mặc định `"Đại Gia Tóp Tóp 👑"`), `#giftTitle` (`"SƯ TỬ ĐỊA NGỤC (HELL LION)"`), `#comboCount` (`x1`, `x5`, `x10` mặc định, `x99`).

---

## 3. Động Cơ Hoạt Ảnh, Âm Thanh & Xuất Video

### 3.1. Vòng Lặp Hoạt Ảnh 5 Giây (`renderFrame`)
Chia tiến trình `progress = [0..1]` làm 3 pha:
- `0.0 -> 0.25`: Trồi lên từ đáy (`H * 1.15 -> H * 0.48`), scale `0.5 -> 1.15` theo `easeOut` bậc 3.
- `0.25 -> 0.75`: Gầm rú, thở nhấp nhô tại trung tâm kèm hiệu ứng rung camera `shakeOffset` (biên độ tới `14px` trong khoảng `0.22..0.75`).
- `0.75 -> 1.0`: Vươn cao và tan biến dần (`globalAlpha` giảm về `0`).

Các lớp vẽ mỗi khung hình:
1. `drawHellFissures` (khe nứt dung nham dưới nền).
2. `drawHellLion` (ảnh đã tách nền hoặc vector procedural).
3. `drawShockwaves` (sóng xung kích).
4. **Hệ thống 150 hạt `Particle`** (`smoke`, `ember`, `magma`, `fire`).
5. `drawGiftBanner` (banner quà tặng + số combo `x...` nảy đàn hồi).

### 3.2. Bộ Tổng Hợp Âm Thanh Web Audio (`playLionHellSound`)
- Tổng hợp real-time bằng `AudioContext` (tự động `resume()`): dao động `sawtooth` tần số thấp qua bộ lọc `lowpass` tạo tiếng rung địa chấn / dung nham + tiếng gầm Sư tử.

### 3.3. Quay & Xuất File `.WebM` (`recordAndExportWebM`)
- Gọi `canvas.captureStream(60)` với `MediaRecorder` codec `video/webm;codecs=vp9` (fallback `video/webm`), bitrate **8 Mbps (`8000000`)**.
- Kích hoạt `triggerEffect()`, quay hết `DURATION + 200ms` rồi dừng recorder, tạo `Blob` và tải về file `TikTok_Gift_Hell_Lion_<timestamp>.webm` kèm dung lượng MB tại `#statusBox`.
- Tự động phát preview 1 lần sau `600ms` khi `DOMContentLoaded`.

---

## 4. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Giữ đúng kích thước Canvas `720x1080` và codec xuất `video/webm;codecs=vp9` 60 FPS / 8 Mbps** để giữ kênh trong suốt Alpha Channel cho OBS/CapCut.
2. **Giữ thuật toán tách nền đen `prepareKeyedSprite`** (luminance threshold `18` / `70`) kèm `try/catch` fallback cho `file://`.
3. **Giữ cả 3 Lion Model (`cinematic1`, `cinematic2`, `procedural`) và 3 Bg Mode (`mock`, `checkered`, `green` `#00ff00`)**.
4. **Giữ hệ thống 150 hạt Particle, khe nứt `drawHellFissures`, sóng xung kích `drawShockwaves`, rung camera pha gầm (`0.22..0.75`), Web Audio synthesizer `playLionHellSound`, và auto-play sau `600ms`.**
