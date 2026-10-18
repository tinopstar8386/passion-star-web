export default async function handler(req, res) {
    const targetUrl = 'https://script.google.com/macros/s/AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec';

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
            // Trả về thẳng lỗi để App biết và hiện Toast đỏ thay vì sập ngầm
            return res.status(200).json({ status: 'error', message: 'Lỗi từ Google: ' + text.substring(0, 60) });
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(200).json({ status: 'error', message: error.message });
    }
}
