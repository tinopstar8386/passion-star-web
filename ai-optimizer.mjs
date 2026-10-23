import fs from 'fs';

const apiKey = process.env.GEMINI_API_KEY;
// Nhận tên file cần tối ưu từ giao diện GitHub (mặc định là index.html)
const targetFile = process.env.TARGET_FILE || 'index.html';
const customPrompt = process.env.CUSTOM_PROMPT || 'Tối ưu hiệu năng, làm sạch code nhưng giữ nguyên 100% logic, giao diện và các biến kết nối dữ liệu.';

if (!fs.existsSync(targetFile)) {
  console.error(`Không tìm thấy file: ${targetFile}`);
  process.exit(1);
}

const currentCode = fs.readFileSync(targetFile, 'utf8');

const systemInstruction = `Bạn là chuyên gia tối ưu hóa mã nguồn. 
Nhiệm vụ của bạn: ${customPrompt}
QUY TẮC BẮT BUỘC:
1. Chỉ trả về TOÀN BỘ mã nguồn hoàn chỉnh sau khi đã tối ưu của file.
2. KHÔNG bọc code trong dấu \`\`\`html hay \`\`\`javascript.
3. KHÔNG viết lời chào hay giải thích, vì kết quả trả về sẽ được ghi đè trực tiếp vào file chạy thực tế.`;

async function optimizeCode() {
  console.log(`Đang gửi file ${targetFile} tới Gemini API...`);
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ parts: [{ text: currentCode }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Lỗi từ Gemini API:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  let optimizedCode = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (optimizedCode) {
    // Tự động lọc bỏ dấu markdown ``` nếu AI vô tình thêm vào
    optimizedCode = optimizedCode.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    fs.writeFileSync(targetFile, optimizedCode, 'utf8');
    console.log(`Đã tối ưu và cập nhật thành công file: ${targetFile}`);
  } else {
    console.error('Không nhận được phản hồi hợp lệ từ Gemini.');
    process.exit(1);
  }
}

optimizeCode();
