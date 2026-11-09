import fs from 'fs';

let content = fs.readFileSync('scripts/2FA_Service.gs', 'utf8');

// 1. Add ZALO_CONFIG right below VALID_AUTH_HASH
const configAnchor = 'const VALID_AUTH_HASH = "11fbfb0a6a696da38da248f9568be2c32c43bd89812696fccc1d068ba41b8bf5";';

const zaloConfigCode = `const VALID_AUTH_HASH = "11fbfb0a6a696da38da248f9568be2c32c43bd89812696fccc1d068ba41b8bf5";

// =====================================================================
// CẤU HÌNH ZALO BOT & WEBHOOK THÔNG BÁO TỰ ĐỘNG
// =====================================================================
const ZALO_CONFIG = {
  // Access Token của Zalo Official Account (hoặc lưu trong Cài đặt dự án > Thuộc tính tập lệnh)
  ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty("ZALO_ACCESS_TOKEN") || "",
  // Zalo User ID của Quản trị viên nhận thông báo đẩy OTP tự động
  ADMIN_USER_ID: PropertiesService.getScriptProperties().getProperty("ZALO_ADMIN_USER_ID") || "",
  // OpenAPI Endpoint gửi tin nhắn của Zalo OA v3
  SEND_MESSAGE_URL: "https://openapi.zalo.me/v3.0/oa/message/cs",
  // Webhook bot tùy chọn nếu dùng bot trung gian ngoài OA
  CUSTOM_WEBHOOK_URL: PropertiesService.getScriptProperties().getProperty("ZALO_WEBHOOK_URL") || ""
};`;

if (!content.includes(configAnchor)) {
  console.error('Could not find configAnchor in 2FA_Service.gs');
  process.exit(1);
}
content = content.replace(configAnchor, zaloConfigCode);

// 2. Intercept Zalo Webhook inside handleAppScriptRequest
const requestAnchor = `    } else if (e && e.postData && e.postData.contents) {
      const parsed = JSON.parse(e.postData.contents);
      action = parsed.action;
      payload = parsed.payload || {};
    }`;

const newRequestCode = `    } else if (e && e.postData && e.postData.contents) {
      let parsed = null;
      try {
        parsed = JSON.parse(e.postData.contents);
      } catch (err) {
        parsed = null;
      }

      if (parsed) {
        // Kiểm tra xem có phải Webhook gửi từ Zalo Bot không
        if (parsed.event_name || (parsed.sender && parsed.message) || parsed.is_zalo_webhook || (parsed.message && parsed.sender_id)) {
          return handleZaloBotWebhook(parsed);
        }
        action = parsed.action;
        payload = parsed.payload || {};
      }
    }`;

if (!content.includes(requestAnchor)) {
  console.error('Could not find requestAnchor in 2FA_Service.gs');
  process.exit(1);
}
content = content.replace(requestAnchor, newRequestCode);

// 3. Add actions to switch(action) for manual triggering & testing from Web App
const switchAnchor = `      case "getColumnWidths":
        resultData = getColumnWidths();
        break;`;

const newSwitchActions = `      case "getColumnWidths":
        resultData = getColumnWidths();
        break;

      case "triggerZaloScan":
        resultData = scanAndNotifyNewOtpZalo();
        break;

      case "sendZaloTestMessage":
        resultData = sendZaloMessage(payload.userId || ZALO_CONFIG.ADMIN_USER_ID, payload.text || "🔔 Passion Star Test Zalo Bot OK!");
        break;

      case "setZaloConfig":
        if (payload.accessToken) PropertiesService.getScriptProperties().setProperty("ZALO_ACCESS_TOKEN", payload.accessToken);
        if (payload.adminUserId) PropertiesService.getScriptProperties().setProperty("ZALO_ADMIN_USER_ID", payload.adminUserId);
        if (payload.customWebhook) PropertiesService.getScriptProperties().setProperty("ZALO_WEBHOOK_URL", payload.customWebhook);
        resultData = { success: true, message: "Đã lưu cấu hình Zalo thành công!" };
        break;`;

if (!content.includes(switchAnchor)) {
  console.error('Could not find switchAnchor in 2FA_Service.gs');
  process.exit(1);
}
content = content.replace(switchAnchor, newSwitchActions);

// 4. Add the complete Zalo functions to the bottom of 2FA_Service.gs
const zaloBotFunctions = `
/**
 * =========================================================================
 * BỘ TÍCH HỢP ZALO BOT: CHAT TƯƠNG TÁC 2 CHIỀU & TỰ ĐỘNG ĐẨY THÔNG BÁO OTP
 * =========================================================================
 */

/**
 * Xử lý Webhook tin nhắn đến từ Zalo Bot
 */
function handleZaloBotWebhook(data) {
  let senderId = "";
  let messageText = "";

  // 1. Trích xuất User ID & Nội dung tin nhắn từ Zalo Payload
  if (data.sender && data.sender.id) {
    senderId = data.sender.id;
  } else if (data.user_id_by_app) {
    senderId = data.user_id_by_app;
  } else if (data.sender_id) {
    senderId = data.sender_id;
  }

  if (data.message && typeof data.message.text === "string") {
    messageText = data.message.text.trim();
  } else if (typeof data.text === "string") {
    messageText = data.text.trim();
  }

  // Nếu không phải tin nhắn văn bản (ví dụ sự kiện quan tâm/bỏ quan tâm)
  if (!messageText) {
    const ack = { error: 0, message: "Event received" };
    return ContentService.createTextOutput(JSON.stringify(ack)).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Xử lý các câu lệnh /otp, /pass, /device, /fwd, /help
  const replyText = processZaloCommand(messageText, senderId);

  // 3. Gửi tin nhắn phản hồi về Zalo OpenAPI (nếu có senderId và Access Token)
  if (senderId) {
    sendZaloMessage(senderId, replyText);
  }

  // 4. Trả về phản hồi JSON HTTP (tương thích các nền tảng Webhook trực tiếp)
  const responseObj = {
    error: 0,
    message: "Success",
    reply: replyText,
    text: replyText
  };
  return ContentService.createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Bộ xử lý logic câu lệnh tương tác của Zalo Bot
 */
function processZaloCommand(rawText, senderId) {
  let text = (rawText || "").trim();
  if (text.startsWith("/")) text = text.slice(1).trim();

  const parts = text.split(/\\s+/);
  const cmd = parts[0].toLowerCase();
  const query = parts.slice(1).join(" ").trim();

  // 1. LỆNH LẤY MÃ OTP (/otp hoặc /code hoặc /ma)
  if (cmd === "otp" || cmd === "code" || cmd === "ma" || cmd === "layma") {
    if (!query) {
      // Không truyền tên -> Quét mã OTP mới nhất từ toàn bộ hòm thư trong vòng 1 giờ
      const latestCode = getEmailVerificationCode("tino.hohr@gmail.com");
      if (latestCode) {
        return "🔐 [PASSION STAR - MÃ 2FA MỚI NHẤT]\\n" +
               "━━━━━━━━━━━━━━━━━━━━\\n" +
               "🔑 MÃ OTP: " + latestCode + "\\n" +
               "📧 Hòm thư: tino.hohr@gmail.com\\n" +
               "⏱️ Trạng thái: Hợp lệ trong 1 giờ\\n" +
               "━━━━━━━━━━━━━━━━━━━━\\n" +
               "👉 Bấm giữ mã số để sao chép nhanh!";
      } else {
        return "⚠️ [THÔNG BÁO OTP]\\n" +
               "Hiện chưa có mã OTP nào gửi về trong vòng 1 giờ qua.\\n" +
               "💡 Bạn có thể tìm theo tên Idol: /otp <tên idol hoặc email>";
      }
    }

    // Tìm tài khoản theo query
    const acc = findAccountInSheets(query);
    if (!acc) {
      return "❌ Không tìm thấy Idol hoặc Email nào khớp với: \\"" + query + "\\"\\n" +
             "👉 Vui lòng thử lại với tên khác hoặc gõ /help để xem hướng dẫn.";
    }

    const code = getEmailVerificationCode(acc.email);
    if (code) {
      return "🔐 [PASSION STAR - MÃ 2FA TIKTOK]\\n" +
             "━━━━━━━━━━━━━━━━━━━━\\n" +
             "👤 Idol: " + acc.tenIdol + " (" + acc.team + ")\\n" +
             "📧 Email: " + acc.email + "\\n" +
             "🔑 MÃ OTP: " + code + "\\n" +
             "⏱️ Thời gian: Vừa nhận trong 1 giờ\\n" +
             "━━━━━━━━━━━━━━━━━━━━\\n" +
             "👉 Bấm giữ mã số để sao chép nhanh vào TikTok!";
    } else {
      return "⏳ [CHƯA CÓ MÃ MỚI]\\n" +
             "━━━━━━━━━━━━━━━━━━━━\\n" +
             "👤 Idol: " + acc.tenIdol + "\\n" +
             "📧 Email: " + acc.email + "\\n" +
             "⚠️ Chưa tìm thấy mã OTP nào trong vòng 1 giờ qua.\\n" +
             "💡 Hãy bấm 'Gửi lại mã' trên TikTok và gõ lại lệnh sau 5 giây!";
    }
  }

  // 2. LỆNH TRA MẬT KHẨU TIKTOK & EMAIL (/pass hoặc /mk hoặc /matkhau)
  if (cmd === "pass" || cmd === "mk" || cmd === "matkhau" || cmd === "password") {
    if (!query) {
      return "💡 Cú pháp: /pass <tên idol hoặc email>\\nVí dụ: /pass royen";
    }
    const acc = findAccountInSheets(query);
    if (!acc) {
      return "❌ Không tìm thấy thông tin tài khoản: \\"" + query + "\\"";
    }

    return "🔑 [THÔNG TIN ĐĂNG NHẬP IDOL]\\n" +
           "━━━━━━━━━━━━━━━━━━━━\\n" +
           "👑 Idol: " + acc.tenIdol + " (" + acc.team + ")\\n" +
           "🎵 TikTok ID: " + (acc.tiktokId || "Chưa có") + "\\n" +
           "🔒 Pass TikTok: " + (acc.passTiktok || "(Trống)") + "\\n" +
           "📧 Email: " + acc.email + "\\n" +
           "🔒 Pass Email: " + (acc.passEmail || "(Trống)") + "\\n" +
           "━━━━━━━━━━━━━━━━━━━━\\n" +
           "⚠️ Nghiêm cấm chia sẻ mật khẩu ra bên ngoài!";
  }

  // 3. LỆNH TRA CỨU THIẾT BỊ ĐĂNG NHẬP (/device hoặc /may hoặc /thietbi)
  if (cmd === "device" || cmd === "may" || cmd === "thietbi") {
    if (!query) {
      return "💡 Cú pháp: /device <tên idol>\\nVí dụ: /device royen";
    }
    const acc = findAccountInSheets(query);
    if (!acc) {
      return "❌ Không tìm thấy Idol: \\"" + query + "\\"";
    }

    let devStr = (acc.thietBiIdol || "").trim();
    if (!devStr) devStr = "Chưa có thiết bị nào được lưu";

    return "📱 [THIẾT BỊ ĐĂNG NHẬP]\\n" +
           "━━━━━━━━━━━━━━━━━━━━\\n" +
           "👤 Idol: " + acc.tenIdol + "\\n" +
           "📋 Danh sách máy:\\n" + devStr + "\\n" +
           "━━━━━━━━━━━━━━━━━━━━\\n" +
           "🏛️ Đại lý: " + (acc.daiLi || "Passion Star");
  }

  // 4. LỆNH KIỂM TRA FORWARD EMAIL (/fwd hoặc /forward hoặc /checkmail)
  if (cmd === "fwd" || cmd === "forward" || cmd === "checkmail") {
    return "📬 [TRẠNG THÁI CHUYỂN TIẾP EMAIL]\\n" +
           "━━━━━━━━━━━━━━━━━━━━\\n" +
           "🎯 Hòm thư đích: tino.hohr@gmail.com\\n" +
           "⚙️ Hệ thống đang tự động lọc mã OTP trong 1 tiếng và trong ngày.\\n" +
           "💡 Để kiểm tra từng tài khoản, vui lòng dùng lệnh:\\n" +
           "👉 /otp <tên idol> để lấy mã trực tiếp.";
  }

  // 5. LỆNH HƯỚNG DẪN (/help hoặc /menu hoặc mặc định)
  return "🤖 [PASSION STAR BOT - HƯỚNG DẪN]\\n" +
         "━━━━━━━━━━━━━━━━━━━━\\n" +
         "1️⃣ /otp <tên idol> : Lấy mã OTP TikTok mới nhất\\n" +
         "2️⃣ /pass <tên idol> : Lấy mật khẩu TikTok & Email\\n" +
         "3️⃣ /device <tên idol> : Xem danh sách máy đang đăng nhập\\n" +
         "4️⃣ /fwd : Kiểm tra hòm thư chuyển tiếp\\n" +
         "5️⃣ /help : Xem danh sách lệnh\\n" +
         "━━━━━━━━━━━━━━━━━━━━\\n" +
         "💡 Mẹo: Có thể gõ không cần dấu gạch chéo (VD: otp royen)";
}

/**
 * Gửi tin nhắn qua Zalo OpenAPI v3
 */
function sendZaloMessage(recipientUserId, textMessage) {
  if (!recipientUserId || !textMessage) return null;

  const accessToken = ZALO_CONFIG.ACCESS_TOKEN || PropertiesService.getScriptProperties().getProperty("ZALO_ACCESS_TOKEN");
  if (accessToken && accessToken !== "YOUR_ZALO_ACCESS_TOKEN") {
    try {
      const url = ZALO_CONFIG.SEND_MESSAGE_URL || "https://openapi.zalo.me/v3.0/oa/message/cs";
      const payload = {
        recipient: { user_id: recipientUserId.toString() },
        message: { text: textMessage }
      };
      const options = {
        method: "post",
        contentType: "application/json",
        headers: { access_token: accessToken },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      const res = UrlFetchApp.fetch(url, options);
      return JSON.parse(res.getContentText());
    } catch (e) {
      Logger.log("Lỗi sendZaloMessage OA: " + e.toString());
    }
  }

  // Gửi qua Custom Webhook Bot (nếu cấu hình)
  const customWebhook = ZALO_CONFIG.CUSTOM_WEBHOOK_URL || PropertiesService.getScriptProperties().getProperty("ZALO_WEBHOOK_URL");
  if (customWebhook) {
    try {
      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          recipient_id: recipientUserId,
          text: textMessage,
          message: textMessage
        }),
        muteHttpExceptions: true
      };
      UrlFetchApp.fetch(customWebhook, options);
    } catch (e) {
      Logger.log("Lỗi sendZaloMessage Custom: " + e.toString());
    }
  }
  return null;
}

/**
 * TỰ ĐỘNG QUÉT & ĐẨY THÔNG BÁO VỀ ZALO KHI CÓ MÃ OTP MỚI ĐẾN
 * Thiết lập trong Apps Script: Kích hoạt (Triggers) > Thêm trình kích hoạt:
 * - Hàm chạy: scanAndNotifyNewOtpZalo
 * - Nguồn sự kiện: Theo thời gian (Time-driven)
 * - Loại bộ đếm: Theo số phút (Minutes timer) > Mỗi 1 hoặc 2 phút.
 */
function scanAndNotifyNewOtpZalo() {
  const adminId = ZALO_CONFIG.ADMIN_USER_ID || PropertiesService.getScriptProperties().getProperty("ZALO_ADMIN_USER_ID");
  if (!adminId) {
    return { success: false, message: "Chưa cấu hình ZALO_ADMIN_USER_ID" };
  }

  const now = new Date();
  const cache = CacheService.getScriptCache();
  let countNotified = 0;

  try {
    const threads = GmailApp.search("newer_than:5m", 0, 5);
    for (let thread of threads) {
      const msgs = thread.getMessages();
      for (let msg of msgs) {
        const msgId = msg.getId();
        if (cache.get("NOTIFIED_ZALO_" + msgId)) continue;

        const msgDate = msg.getDate();
        if (!msgDate || (now.getTime() - msgDate.getTime() > 5 * 60 * 1000)) continue;

        const body = (msg.getPlainBody() || "") + " " + (msg.getSubject() || "");
        
        // Trích xuất mã OTP
        let code = "";
        const mTikTok = body.match(/([0-9]{6})\\s+is your (?:verification )?code/i);
        if (mTikTok) code = mTikTok[1];
        if (!code) {
          const mTiengViet = body.match(/(?:mã(?:\\s+xác\\s+(?:nhận|minh|thực))?|code|otp)[\\s\\:\\-là]+([0-9]{4,8})/i);
          if (mTiengViet) code = mTiengViet[1];
        }
        if (!code) {
          const m6 = body.match(/\\b\\d{6}\\b/);
          if (m6) code = m6[0];
        }

        if (!code) continue;

        // Xác định email nhận & Idol
        const toHeader = (msg.getTo() || "").toLowerCase();
        let matchedEmail = "";
        let matchedIdol = "";
        let matchedTeam = "";

        const allAccs = getAllAccountsCombined();
        for (let acc of allAccs) {
          if (acc.email && (toHeader.includes(acc.email.toLowerCase()) || body.includes(acc.email.toLowerCase()))) {
            matchedEmail = acc.email;
            matchedIdol = acc.tenIdol;
            matchedTeam = acc.team;
            break;
          }
        }

        const timeStr = Utilities.formatDate(msgDate, "Asia/Ho_Chi_Minh", "HH:mm:ss");
        const alertText =
          "🔔 [PASSION STAR - CÓ MÃ OTP MỚI VỪA VỀ]\\n" +
          "━━━━━━━━━━━━━━━━━━━━\\n" +
          "👤 Idol: " + (matchedIdol || "Tài khoản TikTok") + (matchedTeam ? " (" + matchedTeam + ")" : "") + "\\n" +
          "📧 Mail: " + (matchedEmail || toHeader) + "\\n" +
          "🔑 MÃ OTP: " + code + "\\n" +
          "⏱️ Nhận lúc: " + timeStr + "\\n" +
          "━━━━━━━━━━━━━━━━━━━━\\n" +
          "👉 Bấm giữ mã số để copy nhanh!";

        sendZaloMessage(adminId, alertText);
        cache.put("NOTIFIED_ZALO_" + msgId, "1", 3600);
        countNotified++;
      }
    }
  } catch (err) {
    Logger.log("Lỗi scanAndNotifyNewOtpZalo: " + err.toString());
  }

  return { success: true, countNotified: countNotified };
}

/**
 * Tìm kiếm tài khoản trên tất cả các tab theo từ khóa (Tên Idol, Email, TikTok ID)
 */
function findAccountInSheets(rawQuery) {
  if (!rawQuery) return null;
  const q = normalizeVietnameseText(rawQuery).toLowerCase().trim();
  const allAccs = getAllAccountsCombined();

  // 1. Khớp chính xác
  for (let acc of allAccs) {
    const nameNorm = normalizeVietnameseText(acc.tenIdol || "").toLowerCase().trim();
    const mailNorm = (acc.email || "").toLowerCase().trim();
    const tiktokNorm = (acc.tiktokId || "").toLowerCase().trim();

    if (nameNorm === q || mailNorm === q || tiktokNorm === q) {
      return acc;
    }
  }

  // 2. Khớp một phần
  for (let acc of allAccs) {
    const nameNorm = normalizeVietnameseText(acc.tenIdol || "").toLowerCase().trim();
    const mailNorm = (acc.email || "").toLowerCase().trim();
    const tiktokNorm = (acc.tiktokId || "").toLowerCase().trim();

    if (nameNorm.includes(q) || mailNorm.includes(q) || (tiktokNorm && tiktokNorm.includes(q))) {
      return acc;
    }
  }

  return null;
}

/**
 * Gộp toàn bộ danh sách tài khoản từ tất cả các Tab
 */
function getAllAccountsCombined() {
  const tabs = ["Passion Star", "Idol team", "Velion", "Prime Radiant", "Acc Idol mới"];
  let combined = [];
  for (let t of tabs) {
    try {
      const data = getSheetData(t);
      if (Array.isArray(data)) {
        combined = combined.concat(data);
      }
    } catch (e) {}
  }
  return combined;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt bỏ dấu để tìm kiếm thông minh
 */
function normalizeVietnameseText(str) {
  if (!str) return "";
  return str.normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[đĐ]/g, function(m) { return m === 'đ' ? 'd' : 'D'; });
}
`;

content = content + zaloBotFunctions;

fs.writeFileSync('scripts/2FA_Service.gs', content, 'utf8');
console.log('Successfully updated scripts/2FA_Service.gs with Zalo Bot & Webhook integration!');
