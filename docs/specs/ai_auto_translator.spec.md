# Đặc tả Kỹ thuật Module: AI Auto Translator (`ai_auto_translator.html`)

- **File chính:** `ai_auto_translator.html` (1,798 dòng)
- **Mục đích:** Trợ lý dịch thuật Song ngữ Trung – Việt (và Anh) chuyên dụng cho công việc giao tiếp/vận hành, tích hợp OCR ảnh chụp màn hình, kiểm chứng dịch ngược tiếng Việt, trích xuất từ vựng (không Pinyin), Quick Reply Bar, đọc TTS và lịch sử dịch cục bộ.

---

## 1. Mục tiêu & Tổng quan Kiến trúc

`ai_auto_translator.html` chạy hoàn toàn phía client (Single HTML File), sử dụng **Dual-Engine Architecture**:
1. **Engine chính (khi người dùng cấu hình Gemini API Key):** Gọi trực tiếp Gemini REST API (`v1beta/models/...:generateContent`) kèm JSON Schema nghiêm ngặt (`responseMimeType: "application/json"`), tự động thử lần lượt danh sách fallback model:
   - `gemini-3.1-flash-lite` -> `gemini-3.5-flash-lite` -> `gemini-flash-lite-latest` -> `gemini-3.6-flash` -> `gemini-3.8-flash`
2. **Free Fallback Engine (mặc định khi chưa nhập Key hoặc khi Gemini Key lỗi/hết quota):**
   - Dịch văn bản bằng Google Translate GTX endpoint (`translate.googleapis.com/translate_a/single?client=gtx`).
   - OCR ảnh chụp màn hình miễn phí bằng thư viện **Tesseract.js v5** (`chi_sim+vie+eng`, lazy-load từ jsDelivr CDN).
   - Trích xuất từ vựng tiếng Trung bằng `Intl.Segmenter('zh-CN')` (hoặc regex fallback `[\u4e00-\u9fa5]{2,4}`) lọc bỏ stopWords.

### Công nghệ & Giao diện:
- **Vanilla HTML/CSS/JS** + Tailwind CSS CDN (dark mode `#070b14` + `.glass-card`, `.glass-header`), Phosphor Icons (`@phosphor-icons/web`), font `Inter`.
- **Bảo mật API Key:** Biến `apiKey` trong mã nguồn mặc định rỗng `""` (tuân thủ GitHub Push Protection GH013). Người dùng nhập key vào `#rules-modal` (lưu `tino_translator_api_key`) hoặc truyền qua query string `?key=...`.

---

## 2. Giao diện, Presets & LocalStorage Keys

### 2.1. 4 Chế độ Dịch (`PRESETS`)
- `zh_to_vi`: Tiếng Trung -> Tiếng Việt (hiển thị kèm câu Trung gốc đối chiếu ở Secondary Box).
- `vi_to_zh`: Tiếng Việt -> Tiếng Trung (kèm **Vietnamese Back-Translation Verification Box** dịch ngược lại tiếng Việt để kiểm chứng nghĩa).
- `vi_to_en_zh`: Tiếng Việt -> Song ngữ Trung + Anh (hiển thị đồng thời Secondary Box cho Tiếng Anh và Verification Box tiếng Việt).
- `auto_zh_vi`: Tự động nhận diện (`containsChinese()` -> dịch Trung->Việt hoặc ngược lại).

### 2.2. Modals, Drawers & Phím tắt / Clipboard
- `#rules-modal`: Cấu hình Quy tắc dịch tùy chỉnh (`customRule`, chỉ báo dot `#custom-rule-dot` qua `updateCustomRuleIndicator`) và Gemini API Key (`customApiKey`).
- `#history-drawer`: Ngăn kéo hiển thị tối đa **25 bản ghi dịch gần nhất** (`renderHistory`, `clearHistory`) kèm nút đọc TTS & copy nhanh từng mục.
- **Global Paste (`handleGlobalPaste`):** Dán ảnh trực tiếp (`Ctrl+V` ở bất kỳ đâu trừ `reply-input`/`custom-rule-input`/`custom-api-key-input`) sẽ tự nạp ảnh (`loadImageFile`) và kích hoạt OCR + dịch; dán text khi đang ngoài ô input sẽ tự điền vào `#source-input`.

### 2.3. LocalStorage Keys
- `tino_translator_preset_v2`: Preset đang chọn.
- `tino_translator_auto`: Trạng thái Auto-Trigger dịch khi gõ/dán (debounce 800ms khi gõ, 150ms khi dán).
- `tino_translator_autocopy`: Tự động copy kết quả `primaryTranslation` sau khi dịch.
- `tino_translator_vocab`: Bật/tắt khung phân tích từ vựng (`#breakdown-box`).
- `tino_translator_speed`: Tốc độ đọc TTS (`0.8`, `1.0`, `1.2` qua `cycleSpeechRate`).
- `tino_translator_reply_target`: Chế độ Quick Reply (`zh` hoặc `en_zh`).
- `tino_translator_custom_rule`: Rule nhắc bổ sung cho Gemini systemInstruction.
- `tino_translator_api_key`: Gemini API Key do người dùng lưu cục bộ.
- `tino_translator_history_v2`: Mảng tối đa 25 mục lịch sử dịch.

---

## 3. Đặc Tả Chi Tiết Nghiệp Vụ

### 3.1. Dịch Chính (`triggerTranslation`)
- Tạo `querySignature = "${state.preset}|${sourceText}|${imagePrefix}"` để tránh dịch trùng nếu không `force`.
- Kiểm tra `getEffectiveApiKey()`: Nếu không có key -> chạy thẳng `translateWithFreeEngine(sourceText, hasImage)`. Nếu có key -> gọi `callGeminiAPI(payload)` với `temperature: 0.2`, ép đầu ra JSON gồm `extractedText`, `primaryTranslation`, `vietnameseBackTranslation`, `secondaryTranslation`, `detectedTargetLang`, `vocabulary` — **tuyệt đối KHÔNG sinh Pinyin và KHÔNG giải thích sắc thái/nuance**.
- Nếu `callGeminiAPI` thất bại (lỗi mạng/key/quota), tự động fallback sang `translateWithFreeEngine` và báo toast thông tin.

### 3.2. Kiểm Chứng Dịch Ngược & Từ Vựng (`renderTranslationOutput`)
- **Vietnamese Back-Translation Box (`#vi-verification-box`):** Luôn hiển thị mỗi khi kết quả chính là Tiếng Trung (`isPrimaryChinese === true`), giúp người dùng kiểm tra lại câu tiếng Trung vừa tạo có đúng ý tiếng Việt không.
- **Vocabulary Breakdown (`#vocab-list`):** Hiển thị 3–6 từ/cụm từ quan trọng (chỉ gồm `term` + `meaning` + nút phát âm + nút copy, không Pinyin).
- **Quick Swap (`quickSwapDirection`):** Đảo chiều nhanh giữa `zh_to_vi` <-> `vi_to_zh`, lấy nội dung ở `#primary-output` đưa ngược lên `#source-input` và dịch lại ngay.

### 3.3. Quick Reply Bar (`translateReply`, `translateReplyWithFreeEngine`, `quickFillReply`)
- Khung trả lời nhanh phía dưới giúp gõ câu tiếng Việt, hỗ trợ 2 chế độ `zh` (chỉ Tiếng Trung) hoặc `en_zh` (Song ngữ Trung + Anh), luôn kèm câu dịch ngược tiếng Việt (`#reply-vi-verify`) và **tự động copy** câu Tiếng Trung vào clipboard ngay khi dịch xong (`renderReplyOutput`).

### 3.4. Đọc Âm Thanh (TTS) & Sao Chép
- **`speakRawText(text, langCode)` / `stopSpeaking()`:** Dùng Web Speech API (`speechSynthesis`) tôn trọng `state.speechRate` (`0.8x`/`1.0x`/`1.2x`) cho từng ô input, output chính, output phụ, từng từ vựng.
- **`copyToClipboard` & `fallbackCopyToClipboard`:** Copy an toàn cho kết quả chính, text theo ID, hoặc toàn bộ từ vựng (`copyAllVocab`).

---

## 4. Danh Sách Bất Biến & Checklist Không Được Miss Khi Code Lại

1. **Tuyệt đối KHÔNG hardcode Gemini API Key** trong mã nguồn (giữ `apiKey = ""` tránh GH013), chỉ đọc từ `localStorage` (`tino_translator_api_key`) hoặc `?key=`.
2. **Giữ Dual-Engine & Model Chain:** Fallback tuần tự qua 5 model Gemini -> nếu lỗi/không có key thì rơi êm sang Google Translate GTX + Tesseract.js OCR (`chi_sim+vie+eng`) + `Intl.Segmenter`.
3. **Giữ quy tắc "NO Pinyin, NO Nuance":** Output chính và danh sách từ vựng gọn sạch, bù lại **luôn hiển thị `vietnameseBackTranslation`** khi kết quả là Tiếng Trung.
4. **Giữ Global Paste cho ảnh & văn bản (`handleGlobalPaste`)**, Quick Reply tự động copy Tiếng Trung, lịch sử tối đa 25 mục (`tino_translator_history_v2`), và chu kỳ tốc độ đọc `0.8x` -> `1.0x` -> `1.2x`.
5. **Giữ toàn bộ 9 key `localStorage` `tino_translator_*`** để không mất cấu hình/lịch sử của người dùng.
