// File: api/proxy-loichuc.js (Dành riêng cho loichuc.html)
export default async function handler(req, res) {
    // Link Google Apps Script của file loichuc.html
    const targetUrl = 'https://script.google.com/macros/s/AKfycbyUnPauRyR_pxZqK4DKPlPc_LmM3uRzhA0W7S0KIgmj1je9hIl4ye5KKZ2_oQmCsgFY/exec';

    try {
        // Xử lý chống mã hóa kép (Double Stringify)
        let requestBody = req.body;
        if (typeof requestBody === 'object') {
            requestBody = JSON.stringify(requestBody);
        }

        const response = await fetch(targetUrl, {
            method: 'POST',
            body: requestBody,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow'
        });

        // Lấy dữ liệu thô để tránh sập Vercel nếu Google báo lỗi
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return res.status(200).json({ status: 'error', message: 'Lỗi từ Google: ' + text.substring(0, 80) });
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(200).json({ status: 'error', message: error.message });
    }
}
