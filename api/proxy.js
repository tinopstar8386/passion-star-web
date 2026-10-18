export default async function handler(req, res) {
    // Cấp quyền CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Link Google Apps Script của anh
    const targetUrl = 'https://script.google.com/macros/s/AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec';

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            body: JSON.stringify(req.body),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow' // Cho phép Vercel tự động xử lý chuyển hướng 302
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
}
