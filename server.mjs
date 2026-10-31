// server.mjs - Local Development & API Server for Passion Star Web
// Tự động phục vụ file tĩnh và cung cấp API /api/auto-subscribe không cần cài thêm npm packages
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SINGLE_OPT_IN_PUBLICATIONS, subscribeAll } from './auto_subscribe.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.mjs': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // API: POST /api/auto-subscribe
    if (pathname === '/api/auto-subscribe' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
            try {
                const body = JSON.parse(bodyStr || '{}');
                const email = (body.email || '').trim();

                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Email không đúng định dạng' }));
                    return;
                }

                console.log(`[API Server] Nhận yêu cầu kích hoạt cho: ${email}`);
                const results = await subscribeAll(email);
                const successCount = results.filter(r => r.success).length;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'success',
                    total: results.length,
                    successCount: successCount,
                    email: email,
                    results: results
                }));
            } catch (err) {
                console.error('[API Server] Lỗi xử lý:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
        });
        return;
    }

    // Static file serving
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
        safePath = '/mail_activator.html';
    }

    const filePath = path.join(__dirname, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
            res.end('404 Not Found: ' + safePath);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`✨ PASSION STAR LOCAL SERVER ĐÃ SẴN SÀNG!`);
    console.log(`🌐 Truy cập Trình Kích Hoạt Mail tại: http://localhost:${PORT}/mail_activator.html`);
    console.log(`🌐 Trang chủ: http://localhost:${PORT}/index.html`);
    console.log(`⚡ API Endpoint: http://localhost:${PORT}/api/auto-subscribe`);
    console.log(`=============================================================\n`);
});
