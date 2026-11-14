// server.mjs - Local Development, Proxy & Desktop Bridge Server for Passion Star Web
// Tự động phục vụ file tĩnh, proxy API (/api/proxy), auto-subscribe và cầu nối Desktop 2 chiều (/api/desktop/*)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SINGLE_OPT_IN_PUBLICATIONS, subscribeAll } from './auto_subscribe.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = path.resolve(__dirname, '..');
const GAS_TARGET_URL = 'https://script.google.com/macros/s/AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec';

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
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2'
};

// ================= DESKTOP BRIDGE STATE & EVENT QUEUES =================
const desktopState = {
    alwaysOnTop: false,
    visible: true,
    bossMode: false,
    isDesktop: true,
    updatedAt: Date.now()
};

let nativeSeq = 0;
let webSeq = 0;
const nativeQueue = [];
const webQueue = [];
const nativeWaiters = new Set();
const webWaiters = new Set();

function pushEvent(queue, waiters, nextSeqFn, evt) {
    const item = { id: nextSeqFn(), ...evt, ts: Date.now() };
    queue.push(item);
    if (queue.length > 100) queue.shift();
    for (const wake of Array.from(waiters)) {
        waiters.delete(wake);
        wake();
    }
    return item;
}

function pushNativeCommand(evt) {
    return pushEvent(nativeQueue, nativeWaiters, () => ++nativeSeq, evt);
}

function pushWebEvent(evt) {
    return pushEvent(webQueue, webWaiters, () => ++webSeq, evt);
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function parseGasJson(text) {
    try {
        return JSON.parse(text);
    } catch (_) {
        return {
            status: 'error',
            message: 'Lỗi từ Google: ' + text.replace(/<[^>]+>/g, ' ').trim().substring(0, 120)
        };
    }
}

async function forwardToGas(requestBody) {
    // Ưu tiên GET ?req=... vì GAS doGet xử lý đầy đủ toàn bộ action (lấy OTP mail, forward, thiết bị)
    const encodedReq = encodeURIComponent(requestBody);
    if (encodedReq.length <= 3500) {
        try {
            const getResp = await fetch(`${GAS_TARGET_URL}?req=${encodedReq}`, {
                method: 'GET',
                redirect: 'follow'
            });
            const getData = parseGasJson(await getResp.text());
            if (getData && (getData.status === 'success' || getData.status === 'error')) {
                return getData;
            }
        } catch (_) {}
    }

    const postResp = await fetch(GAS_TARGET_URL, {
        method: 'POST',
        body: requestBody,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
    });
    return parseGasJson(await postResp.text());
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
}

function handleLongPoll(req, res, queue, waiters, getLatestSeq, since) {
    const pending = queue.filter(e => e.id > since);
    if (pending.length > 0) {
        sendJson(res, 200, { events: pending, seq: getLatestSeq(), state: desktopState });
        return;
    }

    let finished = false;
    const cleanup = () => {
        waiters.delete(onWake);
        clearTimeout(timer);
    };

    const onWake = () => {
        if (finished) return;
        finished = true;
        cleanup();
        const fresh = queue.filter(e => e.id > since);
        sendJson(res, 200, { events: fresh, seq: getLatestSeq(), state: desktopState });
    };

    const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        sendJson(res, 200, { events: [], seq: getLatestSeq(), state: desktopState });
    }, 25000);

    waiters.add(onWake);
    req.on('close', () => {
        if (finished) return;
        finished = true;
        cleanup();
    });
}

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

    const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = parsedUrl.pathname;

    // ================= API: POST /api/proxy (Google Apps Script Proxy nội bộ) =================
    if (pathname === '/api/proxy' && req.method === 'POST') {
        try {
            const rawBody = await readRequestBody(req);
            let requestBody = rawBody || '{}';
            try {
                const parsed = JSON.parse(requestBody);
                if (typeof parsed === 'string') requestBody = parsed;
            } catch (_) {}

            const data = await forwardToGas(requestBody);
            sendJson(res, 200, data);
        } catch (error) {
            sendJson(res, 200, { status: 'error', message: error.message });
        }
        return;
    }

    // ================= API: DESKTOP BRIDGE (/api/desktop/*) =================
    if (pathname === '/api/desktop/health' && req.method === 'GET') {
        sendJson(res, 200, { status: 'ok', app: 'passion-2fa-desktop', port: PORT });
        return;
    }

    if (pathname === '/api/desktop/state' && req.method === 'GET') {
        sendJson(res, 200, { ...desktopState, nativeSeq, webSeq });
        return;
    }

    if (pathname === '/api/desktop/poll-native' && req.method === 'GET') {
        const since = Number(parsedUrl.searchParams.get('since') || 0);
        handleLongPoll(req, res, nativeQueue, nativeWaiters, () => nativeSeq, since);
        return;
    }

    if (pathname === '/api/desktop/poll-web' && req.method === 'GET') {
        const since = Number(parsedUrl.searchParams.get('since') || 0);
        handleLongPoll(req, res, webQueue, webWaiters, () => webSeq, since);
        return;
    }

    if (pathname === '/api/desktop/command' && req.method === 'POST') {
        try {
            const body = JSON.parse((await readRequestBody(req)) || '{}');
            const type = body.type || '';
            desktopState.updatedAt = Date.now();

            if (type === 'toggleTopMost') {
                desktopState.alwaysOnTop = !desktopState.alwaysOnTop;
                pushNativeCommand({ type: 'setTopMost', value: desktopState.alwaysOnTop });
                pushWebEvent({ type: 'topMostChanged', value: desktopState.alwaysOnTop });
            } else if (type === 'setTopMost') {
                desktopState.alwaysOnTop = Boolean(body.value);
                pushNativeCommand({ type: 'setTopMost', value: desktopState.alwaysOnTop });
                pushWebEvent({ type: 'topMostChanged', value: desktopState.alwaysOnTop });
            } else if (type === 'hideToTray') {
                desktopState.visible = false;
                pushNativeCommand({ type: 'hideToTray' });
            } else if (type === 'showWindow') {
                desktopState.visible = true;
                pushNativeCommand({ type: 'showWindow' });
            } else if (type === 'createShortcut') {
                pushNativeCommand({ type: 'createShortcut' });
            } else if (type === 'bossKeySynced') {
                desktopState.bossMode = Boolean(body.value);
                pushNativeCommand({ type: 'bossModeSynced', value: desktopState.bossMode });
            } else if (type === 'urgentAlarm') {
                desktopState.urgentAlarmCount = Number(body.count || 0);
                desktopState.lastUrgentAlarm = String(body.summary || '');
                if (body.bringToFront === true || !desktopState.visible) {
                    desktopState.visible = true;
                    pushNativeCommand({ type: 'showWindow' });
                }
            } else {
                sendJson(res, 400, { status: 'error', message: 'Unknown command type' });
                return;
            }

            sendJson(res, 200, { status: 'ok', state: desktopState });
        } catch (err) {
            sendJson(res, 400, { status: 'error', message: err.message });
        }
        return;
    }

    if (pathname === '/api/desktop/native-event' && req.method === 'POST') {
        try {
            const body = JSON.parse((await readRequestBody(req)) || '{}');
            const type = body.type || '';
            desktopState.updatedAt = Date.now();

            if (type === 'topMostChanged') {
                desktopState.alwaysOnTop = Boolean(body.value);
                pushWebEvent({ type: 'topMostChanged', value: desktopState.alwaysOnTop });
            } else if (type === 'visibilityChanged') {
                desktopState.visible = Boolean(body.value);
                pushWebEvent({ type: 'visibilityChanged', value: desktopState.visible });
            } else if (type === 'toggleBossKey') {
                desktopState.bossMode = typeof body.value === 'boolean' ? body.value : !desktopState.bossMode;
                pushWebEvent({ type: 'toggleBossKey', value: desktopState.bossMode });
            } else if (type === 'lockApp') {
                pushWebEvent({ type: 'lockApp' });
            } else if (type === 'toast') {
                pushWebEvent({ type: 'toast', message: body.message || '', level: body.level || 'info' });
            }

            sendJson(res, 200, { status: 'ok', state: desktopState });
        } catch (err) {
            sendJson(res, 400, { status: 'error', message: err.message });
        }
        return;
    }

    // ================= API: POST /api/auto-subscribe =================
    if (pathname === '/api/auto-subscribe' && req.method === 'POST') {
        try {
            const bodyStr = await readRequestBody(req);
            const body = JSON.parse(bodyStr || '{}');
            const email = (body.email || '').trim();

            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                sendJson(res, 400, { status: 'error', message: 'Email không đúng định dạng' });
                return;
            }

            console.log(`[API Server] Nhận yêu cầu kích hoạt cho: ${email}`);
            const results = await subscribeAll(email);
            const successCount = results.filter(r => r.success).length;

            sendJson(res, 200, {
                status: 'success',
                total: results.length,
                successCount: successCount,
                email: email,
                results: results
            });
        } catch (err) {
            console.error('[API Server] Lỗi xử lý:', err);
            sendJson(res, 500, { status: 'error', message: err.message });
        }
        return;
    }


    // ================= STATIC FILE SERVING =================
    let decodedPath = '/';
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch (_) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('400 Bad Request');
        return;
    }

    if (decodedPath === '/' || decodedPath === '\\') {
        decodedPath = '/mail_activator.html';
    }

    const relativePath = decodedPath.replace(/^[\/\\]+/, '');
    const filePath = path.resolve(ROOT_DIR, relativePath);
    if (filePath !== ROOT_DIR && !filePath.startsWith(ROOT_DIR + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
            res.end('404 Not Found: ' + decodedPath);
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
    console.log(`✨ PASSION STAR LOCAL SERVER ĐÃ SẴN SÀNG! (PORT ${PORT})`);
    console.log(`🛡️  Passion 2FA Desktop: http://127.0.0.1:${PORT}/2fa.html?desktop=1`);
    console.log(`🌐 Trình Kích Hoạt Mail: http://localhost:${PORT}/mail_activator.html`);
    console.log(`⚡ Proxy GAS API: http://127.0.0.1:${PORT}/api/proxy`);
    console.log(`=============================================================\n`);
});
