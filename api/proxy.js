export default async function handler(req, res) {
    const targetUrl = 'https://script.google.com/macros/s/AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec';

    try {
        let requestBody = req.body;
        if (typeof requestBody === 'object' && requestBody !== null) {
            requestBody = JSON.stringify(requestBody);
        } else if (typeof requestBody !== 'string' || !requestBody.trim()) {
            requestBody = '{}';
        }
        try {
            const doubleParsed = JSON.parse(requestBody);
            if (typeof doubleParsed === 'string') requestBody = doubleParsed;
        } catch (_) {}

        const parseGasResponse = (text) => {
            try {
                return JSON.parse(text);
            } catch (_) {
                return { status: 'error', message: 'Lỗi từ Google: ' + text.replace(/<[^>]+>/g, ' ').trim().substring(0, 120) };
            }
        };

        // Ưu tiên GET ?req=... vì doGet của GAS Web App xử lý đầy đủ toàn bộ action (lấy OTP mail, forward, thiết bị)
        const encodedReq = encodeURIComponent(requestBody);
        if (encodedReq.length <= 3500) {
            const getResp = await fetch(`${targetUrl}?req=${encodedReq}`, {
                method: 'GET',
                redirect: 'follow'
            });
            const getData = parseGasResponse(await getResp.text());
            if (getData && (getData.status === 'success' || getData.status === 'error')) {
                return res.status(200).json(getData);
            }
        }

        // Dự phòng POST nếu payload quá lớn hoặc GET không trả về status/data hợp lệ
        const postResp = await fetch(targetUrl, {
            method: 'POST',
            body: requestBody,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            redirect: 'follow'
        });
        const postData = parseGasResponse(await postResp.text());
        res.status(200).json(postData);
    } catch (error) {
        res.status(200).json({ status: 'error', message: error.message });
    }
}
