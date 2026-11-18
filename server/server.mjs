// server.mjs - Local Development, Proxy & Desktop Bridge Server for Passion Star Web
// Tự động phục vụ file tĩnh, proxy API (/api/proxy), auto-subscribe và cầu nối Desktop 2 chiều (/api/desktop/*)
import http from 'http';
import https from 'https';
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

// ================= ARAM MAYHEM BLITZ & LIVE CLIENT BRIDGE =================
const mayhemState = {
    mapMode: 'pirate_60', // 'pirate_60' (0:40 first, 60s respawn) | 'abyss_90' (1:45 first, 90s respawn)
    minimap: {
        scale: 1.0,
        sizePx: 260,
        offsetX: 16,
        offsetY: 16,
        flipped: false,
        autoDetect: true,
        calibrateMode: false,
        showMinimapOverlay: true,
        showHudOverlay: true,
        autoWatchPixels: true,
        gameWidth: 1920,
        gameHeight: 1080,
        detectedSource: 'default'
    },
    relicTimers: [
        { id: 'ally_inner', label: 'Trụ Trong Đồng Minh', short: 'Trong Ta', nx: 0.25, ny: 0.75, remaining: 0, total: 60, running: false },
        { id: 'ally_outer', label: 'Trụ Ngoài Đồng Minh', short: 'Ngoài Ta', nx: 0.41, ny: 0.59, remaining: 0, total: 60, running: false },
        { id: 'enemy_outer', label: 'Trụ Ngoài Đối Phương', short: 'Ngoài Địch', nx: 0.59, ny: 0.41, remaining: 0, total: 60, running: false },
        { id: 'enemy_inner', label: 'Trụ Trong Đối Phương', short: 'Trong Địch', nx: 0.75, ny: 0.25, remaining: 0, total: 60, running: false }
    ],
    advisorSummary: {
        champName: 'Vi',
        champTier: 'S',
        bestAugment: '',
        bestScore: 0,
        nextItems: [],
        tacticalNote: ''
    },
    pendingAction: null,
    pendingActionSeq: 0,
    relicEventSeq: 0,
    lastRelicTrigger: null,
    lastCapturedFrame: null,
    capturedFrameSeq: 0,
    updatedAt: Date.now()
};

function fetchRiotLiveClient() {
    return new Promise((resolve) => {
        const req = https.get(
            {
                hostname: '127.0.0.1',
                port: 2999,
                path: '/liveclientdata/allgamedata',
                rejectUnauthorized: false,
                timeout: 1200
            },
            (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    try {
                        const raw = Buffer.concat(chunks).toString('utf8');
                        const data = JSON.parse(raw);
                        resolve({
                            connected: true,
                            gameTime: data?.gameData?.gameTime ?? 0,
                            mapName: data?.gameData?.mapName || '',
                            mapNumber: data?.gameData?.mapNumber || 0,
                            gameMode: data?.gameData?.gameMode || '',
                            activePlayer: {
                                championName: data?.activePlayer?.championStats ? (data?.allPlayers?.find(p => p.summonerName === data?.activePlayer?.summonerName || p.riotId === data?.activePlayer?.riotId)?.championName || '') : '',
                                level: data?.activePlayer?.level || 1,
                                currentGold: data?.activePlayer?.currentGold || 0,
                                summonerName: data?.activePlayer?.summonerName || data?.activePlayer?.riotId || ''
                            },
                            allPlayers: (data?.allPlayers || []).map(p => ({
                                championName: p.championName || '',
                                team: p.team || '',
                                level: p.level || 1,
                                isDead: Boolean(p.isDead),
                                items: (p.items || []).map(it => ({ itemID: it.itemID, displayName: it.displayName }))
                            }))
                        });
                    } catch (err) {
                        resolve({ connected: false, reason: 'Parse error: ' + err.message });
                    }
                });
            }
        );
        req.on('timeout', () => {
            req.destroy();
            resolve({ connected: false, reason: 'Timeout' });
        });
        req.on('error', (err) => {
            resolve({ connected: false, reason: err.message });
        });
    });
}

function readRiotConfig() {
    const drives = ['C:', 'D:', 'E:', 'F:'];
    const persistedCandidates = [];
    const cfgCandidates = [];
    for (const d of drives) {
        persistedCandidates.push(`${d}\\Riot Games\\League of Legends\\Config\\PersistedSettings.json`);
        cfgCandidates.push(`${d}\\Riot Games\\League of Legends\\Config\\game.cfg`);
    }

    let result = {
        found: false,
        path: '',
        minimapScale: 1.0,
        hudScale: 1.0,
        flipMiniMap: false,
        width: 1920,
        height: 1080
    };

    for (const p of persistedCandidates) {
        try {
            if (!fs.existsSync(p)) continue;
            const raw = fs.readFileSync(p, 'utf8');
            const parsed = JSON.parse(raw);
            result.found = true;
            result.path = p;
            for (const fileEntry of (parsed.files || [])) {
                for (const sec of (fileEntry.sections || [])) {
                    for (const setting of (sec.settings || [])) {
                        if (setting.name === 'MinimapScale') {
                            const v = parseFloat(setting.value);
                            if (!isNaN(v) && v >= 0.1 && v <= 4.0) result.minimapScale = v;
                        } else if (setting.name === 'GlobalScale' || setting.name === 'HUDScale') {
                            const v = parseFloat(setting.value);
                            if (!isNaN(v) && v >= 0.1 && v <= 4.0) result.hudScale = v;
                        } else if (setting.name === 'FlipMiniMap') {
                            result.flipMiniMap = String(setting.value) === '1' || String(setting.value).toLowerCase() === 'true';
                        }
                    }
                }
            }
            break;
        } catch (_) {}
    }

    for (const cfgPath of cfgCandidates) {
        try {
            if (!fs.existsSync(cfgPath)) continue;
            const cfgText = fs.readFileSync(cfgPath, 'utf8');
            if (!result.found) {
                result.found = true;
                result.path = cfgPath;
            }
            const wMatch = cfgText.match(/^\s*Width\s*=\s*(\d+)/m);
            const hMatch = cfgText.match(/^\s*Height\s*=\s*(\d+)/m);
            const mMatch = cfgText.match(/^\s*MinimapScale\s*=\s*([0-9.]+)/m);
            const fMatch = cfgText.match(/^\s*FlipMiniMap\s*=\s*(\d+)/m);
            if (wMatch) result.width = parseInt(wMatch[1], 10);
            if (hMatch) result.height = parseInt(hMatch[1], 10);
            if (mMatch && result.minimapScale === 1.0) {
                const v = parseFloat(mMatch[1]);
                if (!isNaN(v) && v >= 0.1 && v <= 4.0) result.minimapScale = v;
            }
            if (fMatch && !result.flipMiniMap) result.flipMiniMap = fMatch[1] === '1';
            break;
        } catch (_) {}
    }

    return result;
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

    // ================= API: ARAM MAYHEM BLITZ BRIDGE (/api/mayhem/*) =================
    if (pathname === '/api/mayhem/health' && req.method === 'GET') {
        sendJson(res, 200, { status: 'ok', app: 'passion-mayhem-desktop', port: PORT });
        return;
    }

    if (pathname === '/api/mayhem/live-client' && req.method === 'GET') {
        const liveData = await fetchRiotLiveClient();
        sendJson(res, 200, liveData);
        return;
    }

    if (pathname === '/api/mayhem/riot-config' && req.method === 'GET') {
        const cfg = readRiotConfig();
        sendJson(res, 200, cfg);
        return;
    }

    if (pathname === '/api/mayhem/state' && req.method === 'GET') {
        const includeFrame = parsedUrl.searchParams.get('includeFrame') === '1';
        const out = {
            mapMode: mayhemState.mapMode,
            minimap: mayhemState.minimap,
            relicTimers: mayhemState.relicTimers,
            advisorSummary: mayhemState.advisorSummary,
            pendingAction: mayhemState.pendingAction,
            pendingActionSeq: mayhemState.pendingActionSeq,
            relicEventSeq: mayhemState.relicEventSeq,
            lastRelicTrigger: mayhemState.lastRelicTrigger,
            capturedFrameSeq: mayhemState.capturedFrameSeq,
            updatedAt: mayhemState.updatedAt
        };
        if (includeFrame && mayhemState.lastCapturedFrame) {
            out.lastCapturedFrame = mayhemState.lastCapturedFrame;
        }
        sendJson(res, 200, out);
        return;
    }

    if (pathname === '/api/mayhem/state' && req.method === 'POST') {
        try {
            const raw = await readRequestBody(req);
            const body = JSON.parse(raw || '{}');
            mayhemState.updatedAt = Date.now();

            if (typeof body.mapMode === 'string' && (body.mapMode === 'pirate_60' || body.mapMode === 'abyss_90')) {
                mayhemState.mapMode = body.mapMode;
            }
            if (body.minimap && typeof body.minimap === 'object') {
                mayhemState.minimap = { ...mayhemState.minimap, ...body.minimap };
            }
            if (typeof body.triggerRelicIndex === 'number' && mayhemState.relicTimers[body.triggerRelicIndex]) {
                const idx = body.triggerRelicIndex;
                const cd = Number(body.total) || (mayhemState.mapMode === 'pirate_60' ? 60 : 90);
                mayhemState.relicTimers[idx].total = cd;
                mayhemState.relicTimers[idx].remaining = cd;
                mayhemState.relicTimers[idx].running = true;
                mayhemState.relicEventSeq += 1;
                mayhemState.lastRelicTrigger = {
                    seq: mayhemState.relicEventSeq,
                    index: idx,
                    id: mayhemState.relicTimers[idx].id,
                    total: cd,
                    ts: Date.now()
                };
            }
            if (Array.isArray(body.relicTimers)) {
                mayhemState.relicTimers = body.relicTimers.map((rt, idx) => {
                    const base = mayhemState.relicTimers[idx] || {};
                    return { ...base, ...rt };
                });
            }
            if (body.advisorSummary && typeof body.advisorSummary === 'object') {
                mayhemState.advisorSummary = { ...mayhemState.advisorSummary, ...body.advisorSummary };
            }
            if (typeof body.triggerAction === 'string' && body.triggerAction) {
                mayhemState.pendingActionSeq += 1;
                mayhemState.pendingAction = {
                    seq: mayhemState.pendingActionSeq,
                    action: body.triggerAction,
                    ts: Date.now()
                };
            }
            if (body.clearPendingActionSeq && mayhemState.pendingAction && Number(body.clearPendingActionSeq) >= mayhemState.pendingAction.seq) {
                mayhemState.pendingAction = null;
            }
            if (body.lastCapturedFrame && body.lastCapturedFrame.base64) {
                mayhemState.capturedFrameSeq += 1;
                mayhemState.lastCapturedFrame = {
                    seq: mayhemState.capturedFrameSeq,
                    base64: body.lastCapturedFrame.base64,
                    mimeType: body.lastCapturedFrame.mimeType || 'image/jpeg',
                    action: body.lastCapturedFrame.action || 'scan-aug',
                    ts: Date.now()
                };
            }

            sendJson(res, 200, {
                status: 'ok',
                pendingActionSeq: mayhemState.pendingActionSeq,
                capturedFrameSeq: mayhemState.capturedFrameSeq,
                minimap: mayhemState.minimap
            });
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
    console.log(`⚔️  ARAM Mayhem Blitz:   http://127.0.0.1:${PORT}/aram-mayhem.html?desktop=1`);
    console.log(`🌐 Trình Kích Hoạt Mail: http://localhost:${PORT}/mail_activator.html`);
    console.log(`⚡ Proxy GAS API: http://127.0.0.1:${PORT}/api/proxy`);
    console.log(`=============================================================\n`);
});
