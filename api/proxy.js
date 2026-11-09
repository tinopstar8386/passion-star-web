export default async function handler(req, res) {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const targetUrl = 'https://script.google.com/macros/s/AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec';

    try {
        // Xử lý chống mã hóa kép (Double Stringify)
        let requestBody = req.body;
        if (typeof requestBody === 'object') {
            requestBody = JSON.stringify(requestBody);
        }

        // Google Apps Script xử lý dữ liệu và logic (getSheetData, getConfigDevices, saveColumnWidths, v.v.)
        // thông qua hàm doGet(e) nhận tham số ?req= hoặc query params
        let fetchUrl = targetUrl;
        if (req.method === 'GET') {
            const queryIndex = req.url ? req.url.indexOf('?') : -1;
            const queryString = queryIndex !== -1 ? req.url.substring(queryIndex + 1) : '';
            fetchUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
        } else {
            fetchUrl = `${targetUrl}?req=${encodeURIComponent(requestBody || '{}')}`;
        }

        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json, text/plain, */*' },
            redirect: 'follow'
        });

        // Lấy dữ liệu thô để tránh sập Vercel nếu Google báo lỗi
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Dự phòng POST nếu GET không trả về JSON hợp lệ
            try {
                const postResponse = await fetch(targetUrl, {
                    method: 'POST',
                    body: requestBody,
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    redirect: 'follow'
                });
                const postText = await postResponse.text();
                data = JSON.parse(postText);
            } catch (err) {
                return res.status(200).json({ status: 'error', message: 'Lỗi từ Google: ' + text.substring(0, 80) });
            }
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(200).json({ status: 'error', message: error.message });
    }
}
