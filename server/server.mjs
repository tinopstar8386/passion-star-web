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
        sizePx: 221,
        offsetX: 14,
        offsetY: 13,
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
        { id: 'ally_inner', label: 'Trụ Trong Đồng Minh', short: 'Trong Ta', nx: 0.386, ny: 0.697, remaining: 0, total: 60, running: false },
        { id: 'ally_outer', label: 'Trụ Ngoài Đồng Minh', short: 'Ngoài Ta', nx: 0.476, ny: 0.600, remaining: 0, total: 60, running: false },
        { id: 'enemy_outer', label: 'Trụ Ngoài Đối Phương', short: 'Ngoài Địch', nx: 0.600, ny: 0.476, remaining: 0, total: 60, running: false },
        { id: 'enemy_inner', label: 'Trụ Trong Đối Phương', short: 'Trong Địch', nx: 0.703, ny: 0.393, remaining: 0, total: 60, running: false }
    ],
    advisorSummary: {
        champName: 'Vi',
        champTier: 'S',
        bestAugment: '',
        bestScore: 0,
        nextItems: [],
        chosenAugments: [],
        recommendedAugments: [],
        candidateCards: [],
        tacticalNote: ''
    },
    pendingAction: null,
    pendingActionSeq: 0,
    relicEventSeq: 0,
    lastRelicTrigger: null,
    cardClickSeq: 0,
    lastCardClick: null,
    lastCapturedFrame: null,
    capturedFrameSeq: 0,
    modalOpen: false,
    modalEventSeq: 0,
    minimapThumbBase64: '',
    minimapThumbSeq: 0,
    recommendedItemPath: '',
    nativeOcrCards: ['', '', ''],
    nativeOcrSeq: 0,
    chromeTitlebarHeight: 33,
    updatedAt: Date.now()
};

function discoverLeagueConfigDirs() {
    const drives = ['C:', 'D:', 'E:', 'F:', 'G:'];
    const subPaths = [
        '\\Riot Games\\League of Legends\\Config',
        '\\Games\\Riot Games\\League of Legends\\Config'
    ];
    const dirs = [];
    for (const d of drives) {
        for (const sp of subPaths) {
            const dir = `${d}${sp}`;
            if (fs.existsSync(dir)) dirs.push(dir);
        }
    }
    return dirs;
}

function lcuRequestJson(port, password, reqPath) {
    return new Promise((resolve) => {
        const auth = Buffer.from(`riot:${password}`).toString('base64');
        const req = https.get(
            {
                hostname: '127.0.0.1',
                port: Number(port),
                path: reqPath,
                headers: { Authorization: `Basic ${auth}` },
                rejectUnauthorized: false,
                timeout: 900
            },
            (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    try {
                        const raw = Buffer.concat(chunks).toString('utf8');
                        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(raw) });
                    } catch (_) {
                        resolve({ ok: false, data: null });
                    }
                });
            }
        );
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, data: null }); });
        req.on('error', () => resolve({ ok: false, data: null }));
    });
}

async function tryReadLcuSession() {
    const cfgDirs = discoverLeagueConfigDirs();
    for (const cfgDir of cfgDirs) {
        const rootDir = path.dirname(cfgDir);
        const lockPath = path.join(rootDir, 'lockfile');
        if (!fs.existsSync(lockPath)) continue;
        try {
            const raw = fs.readFileSync(lockPath, 'utf8').trim();
            const parts = raw.split(':');
            if (parts.length < 4) continue;
            const lcuPort = parts[2].trim();
            const lcuPass = parts[3].trim();

            const phaseRes = await lcuRequestJson(lcuPort, lcuPass, '/lol-gameflow/v1/gameflow-phase');
            const phase = typeof phaseRes.data === 'string' ? phaseRes.data : '';
            if (phase === 'ChampSelect') {
                const [csRes, gfRes] = await Promise.all([
                    lcuRequestJson(lcuPort, lcuPass, '/lol-champ-select/v1/session'),
                    lcuRequestJson(lcuPort, lcuPass, '/lol-gameflow/v1/session')
                ]);
                if (csRes.ok && csRes.data) {
                    const cs = csRes.data;
                    const localCellId = cs.localPlayerCellId ?? -1;
                    let chosenChampId = 0;
                    const myTeamChampionIds = [];
                    for (const tm of (cs.myTeam || [])) {
                        const effective = Number(tm.championId || tm.championPickIntent || 0);
                        if (effective > 0) myTeamChampionIds.push(effective);
                        if (tm.cellId === localCellId) chosenChampId = effective;
                    }
                    const benchChampionIds = (cs.benchChampions || [])
                        .map(b => Number(typeof b === 'object' ? b.championId : b))
                        .filter(id => id > 0);
                    const queue = gfRes.data?.gameData?.queue || {};
                    return {
                        connected: true,
                        phase: 'ChampSelect',
                        source: 'lcu-lockfile',
                        mapNumber: Number(queue.mapId || 12),
                        gameMode: String(queue.gameMode || 'ARAM'),
                        championId: chosenChampId,
                        myTeamChampionIds,
                        benchChampionIds
                    };
                }
            }
            if (phase && phase !== 'None') {
                return { connected: false, phase, source: 'lcu-lockfile', rootDir };
            }
        } catch (_) {}
    }
    return null;
}

function tryReadLatestR3dLogRoster(allowRecentWithoutLcu = false) {
    const cfgDirs = discoverLeagueConfigDirs();
    let newestPath = '';
    let newestMtime = 0;

    for (const cfgDir of cfgDirs) {
        const gameLogsDir = path.join(path.dirname(cfgDir), 'Logs', 'GameLogs');
        if (!fs.existsSync(gameLogsDir)) continue;
        try {
            for (const sub of fs.readdirSync(gameLogsDir)) {
                const subPath = path.join(gameLogsDir, sub);
                if (!fs.statSync(subPath).isDirectory()) continue;
                for (const fn of fs.readdirSync(subPath)) {
                    if (!fn.endsWith('_r3dlog.txt')) continue;
                    const full = path.join(subPath, fn);
                    const mt = fs.statSync(full).mtimeMs;
                    if (mt > newestMtime) {
                        newestMtime = mt;
                        newestPath = full;
                    }
                }
            }
        } catch (_) {}
    }

    if (!newestPath) return null;
    const ageMs = Date.now() - newestMtime;
    if (ageMs > (allowRecentWithoutLcu ? 180000 : 45 * 60000)) return null;

    try {
        const content = fs.readFileSync(newestPath, 'utf8');
        if (content.includes('GAMESTATE_ENDGAME') || content.includes('GAMESTATE_EXIT')) return null;

        const rx = /ROST\|\s+CONNECTION READY\s+\|\s+(TeamOrder|TeamChaos)\s+\d+\)\s+'([^']+)'(\s+\*\*LOCAL\*\*)?\s+-\s+Champion\(([^)]+)\)/g;
        const players = [];
        let localChamp = '';
        let localSummoner = '';
        let match;
        while ((match = rx.exec(content)) !== null) {
            const teamNorm = match[1] === 'TeamOrder' ? 'ORDER' : 'CHAOS';
            const sum = match[2];
            const isLocal = Boolean(match[3]);
            const champKey = match[4];
            if (isLocal) {
                localChamp = champKey;
                localSummoner = sum;
            }
            players.push({
                championName: champKey,
                rawChampionKey: champKey,
                team: teamNorm,
                level: 3,
                isDead: false,
                items: []
            });
        }
        if (!localChamp) return null;
        return {
            connected: true,
            phase: 'LoadingScreen',
            source: 'r3dlog',
            gameTime: 0,
            activePlayer: {
                championName: localChamp,
                rawChampionKey: localChamp,
                level: 3,
                currentGold: 1400,
                summonerName: localSummoner
            },
            allPlayers: players
        };
    } catch (_) {
        return null;
    }
}

function importRecommendedItemSet(body) {
    const cfgDirs = discoverLeagueConfigDirs();
    const bestCfg = cfgDirs.find(d => fs.existsSync(path.join(d, 'PersistedSettings.json')) || fs.existsSync(path.join(d, 'game.cfg'))) || cfgDirs[0];
    if (!bestCfg) throw new Error('Không tìm thấy thư mục Config của LMHT');

    const recDir = path.join(bestCfg, 'Global', 'Recommended');
    fs.mkdirSync(recDir, { recursive: true });
    const outPath = path.join(recDir, '!!!passion-mayhem.json');

    const champKey = String(body?.championKey || 'any');
    const title = String(body?.title || `Passion Mayhem: ${champKey}`);
    const blocksOut = (Array.isArray(body?.blocks) ? body.blocks : [])
        .map(blk => {
            const items = (Array.isArray(blk?.items) ? blk.items : [])
                .map(it => String(typeof it === 'object' ? it.id : it).trim())
                .filter(id => /^\d+$/.test(id))
                .map(id => ({ id, count: 1 }));
            return {
                recMath: false,
                minSummonerLevel: -1,
                maxSummonerLevel: -1,
                showIfSummonerSpell: '',
                hideIfSummonerSpell: '',
                type: String(blk?.type || 'Gợi Ý Trang Bị'),
                items
            };
        })
        .filter(blk => blk.items.length > 0);

    const doc = {
        title,
        championKey: champKey,
        map: 'any',
        mode: 'any',
        type: 'custom',
        priority: true,
        sortrank: 1000000001,
        blocks: blocksOut
    };
    fs.writeFileSync(outPath, JSON.stringify(doc), 'utf8');
    mayhemState.recommendedItemPath = outPath;
    return { status: 'ok', path: outPath, championKey: champKey, blocksCount: blocksOut.length };
}

function fetchRiotLiveClient() {
    return new Promise((resolve) => {
        const handleFallback = async (reason) => {
            const lcuRes = await tryReadLcuSession();
            if (lcuRes && lcuRes.connected) {
                resolve(lcuRes);
                return;
            }
            const inProgress = lcuRes && (lcuRes.phase === 'InProgress' || lcuRes.phase === 'GameStart');
            const r3d = tryReadLatestR3dLogRoster(!inProgress);
            if (r3d) {
                resolve(r3d);
                return;
            }
            resolve({
                connected: false,
                phase: lcuRes?.phase || 'Idle',
                source: lcuRes?.source || 'none',
                reason
            });
        };

        const req = https.get(
            {
                hostname: '127.0.0.1',
                port: 2999,
                path: '/liveclientdata/allgamedata',
                rejectUnauthorized: false,
                timeout: 1000
            },
            (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    try {
                        const raw = Buffer.concat(chunks).toString('utf8');
                        const data = JSON.parse(raw);
                        const activeSum = data?.activePlayer?.summonerName || '';
                        const activeRiot = data?.activePlayer?.riotId || '';
                        const me = (data?.allPlayers || []).find(p => (activeSum && p.summonerName === activeSum) || (activeRiot && p.riotId === activeRiot));
                        const activeRawKey = String(me?.rawChampionName || '').replace('game_character_displayname_', '');

                        resolve({
                            connected: true,
                            phase: 'InGame',
                            source: 'live-client-2999',
                            gameTime: data?.gameData?.gameTime ?? 0,
                            mapName: data?.gameData?.mapName || '',
                            mapNumber: data?.gameData?.mapNumber || 0,
                            mapTerrain: data?.gameData?.mapTerrain || '',
                            gameMode: data?.gameData?.gameMode || '',
                            activePlayer: {
                                championName: me?.championName || '',
                                rawChampionKey: activeRawKey,
                                level: data?.activePlayer?.level || 1,
                                currentGold: data?.activePlayer?.currentGold || 0,
                                summonerName: activeSum || activeRiot || '',
                                stats: data?.activePlayer?.championStats || null,
                                scores: me?.scores || null,
                                items: (me?.items || []).map(it => ({ itemID: it.itemID, displayName: it.displayName }))
                            },
                            allPlayers: (data?.allPlayers || []).map(p => ({
                                championName: p.championName || '',
                                rawChampionKey: String(p.rawChampionName || '').replace('game_character_displayname_', ''),
                                team: p.team || '',
                                level: p.level || 1,
                                isDead: Boolean(p.isDead),
                                scores: p.scores || null,
                                items: (p.items || []).map(it => ({ itemID: it.itemID, displayName: it.displayName }))
                            }))
                        });
                    } catch (err) {
                        handleFallback('Parse error: ' + err.message);
                    }
                });
            }
        );
        req.on('timeout', () => {
            req.destroy();
            handleFallback('Timeout');
        });
        req.on('error', (err) => {
            handleFallback(err.message);
        });
    });
}

function readRiotConfig() {
    const drives = ['C:', 'D:', 'E:', 'F:', 'G:'];
    const subPaths = [
        '\\Riot Games\\League of Legends\\Config',
        '\\Games\\Riot Games\\League of Legends\\Config'
    ];
    let bestDir = '';
    for (const d of drives) {
        for (const sp of subPaths) {
            const dir = `${d}${sp}`;
            if (fs.existsSync(path.join(dir, 'PersistedSettings.json')) || fs.existsSync(path.join(dir, 'game.cfg'))) {
                bestDir = dir;
                break;
            }
        }
        if (bestDir) break;
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
    if (!bestDir) return result;

    const persistedPath = path.join(bestDir, 'PersistedSettings.json');
    const gameCfgPath = path.join(bestDir, 'game.cfg');
    let persistedMtime = 0;
    let gameCfgMtime = 0;
    let persistedScale = null;
    let persistedFlip = null;
    let gameCfgScale = null;
    let gameCfgFlip = null;

    if (fs.existsSync(persistedPath)) {
        try {
            persistedMtime = fs.statSync(persistedPath).mtimeMs;
            const raw = fs.readFileSync(persistedPath, 'utf8');
            const parsed = JSON.parse(raw);
            result.found = true;
            result.path = persistedPath;
            for (const fileEntry of (parsed.files || [])) {
                for (const sec of (fileEntry.sections || [])) {
                    for (const setting of (sec.settings || [])) {
                        if (setting.name === 'MinimapScale') {
                            const v = parseFloat(setting.value);
                            if (!isNaN(v) && v >= 0.1 && v <= 4.0) persistedScale = v;
                        } else if (setting.name === 'GlobalScale' || setting.name === 'HUDScale') {
                            const v = parseFloat(setting.value);
                            if (!isNaN(v) && v >= 0.05 && v <= 4.0) result.hudScale = v;
                        } else if (setting.name === 'FlipMiniMap') {
                            persistedFlip = String(setting.value) === '1' || String(setting.value).toLowerCase() === 'true';
                        }
                    }
                }
            }
        } catch (_) {}
    }

    if (fs.existsSync(gameCfgPath)) {
        try {
            gameCfgMtime = fs.statSync(gameCfgPath).mtimeMs;
            const cfgText = fs.readFileSync(gameCfgPath, 'utf8');
            if (!result.found) {
                result.found = true;
                result.path = gameCfgPath;
            }
            const wMatch = cfgText.match(/^\s*Width\s*=\s*(\d+)/m);
            const hMatch = cfgText.match(/^\s*Height\s*=\s*(\d+)/m);
            const mMatch = cfgText.match(/^\s*MinimapScale\s*=\s*([0-9.]+)/m);
            const fMatch = cfgText.match(/^\s*FlipMiniMap\s*=\s*(\d+)/m);
            if (wMatch) result.width = parseInt(wMatch[1], 10);
            if (hMatch) result.height = parseInt(hMatch[1], 10);
            if (mMatch) {
                const v = parseFloat(mMatch[1]);
                if (!isNaN(v) && v >= 0.1 && v <= 4.0) gameCfgScale = v;
            }
            if (fMatch) gameCfgFlip = fMatch[1] === '1';
        } catch (_) {}
    }

    const preferGameCfg = gameCfgMtime > persistedMtime;
    if (preferGameCfg && gameCfgScale !== null) {
        result.minimapScale = gameCfgScale;
        result.path = gameCfgPath;
    } else if (persistedScale !== null) {
        result.minimapScale = persistedScale;
    } else if (gameCfgScale !== null) {
        result.minimapScale = gameCfgScale;
    }

    if (preferGameCfg && gameCfgFlip !== null) {
        result.flipMiniMap = gameCfgFlip;
    } else if (persistedFlip !== null) {
        result.flipMiniMap = persistedFlip;
    } else if (gameCfgFlip !== null) {
        result.flipMiniMap = gameCfgFlip;
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

    if (pathname === '/api/mayhem/import-item-set' && req.method === 'POST') {
        try {
            const raw = await readRequestBody(req);
            const body = JSON.parse(raw || '{}');
            const out = importRecommendedItemSet(body);
            sendJson(res, 200, out);
        } catch (err) {
            sendJson(res, 400, { status: 'error', message: err.message });
        }
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
            cardClickSeq: mayhemState.cardClickSeq,
            lastCardClick: mayhemState.lastCardClick,
            capturedFrameSeq: mayhemState.capturedFrameSeq,
            modalOpen: mayhemState.modalOpen,
            modalEventSeq: mayhemState.modalEventSeq,
            minimapThumbSeq: mayhemState.minimapThumbSeq,
            minimapThumbBase64: mayhemState.minimapThumbBase64,
            recommendedItemPath: mayhemState.recommendedItemPath,
            nativeOcrCards: mayhemState.nativeOcrCards,
            nativeOcrSeq: mayhemState.nativeOcrSeq,
            chromeTitlebarHeight: mayhemState.chromeTitlebarHeight,
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
                const reqTotal = Number(body.total);
                if (reqTotal < 0) {
                    mayhemState.relicTimers[idx].remaining = 0;
                    mayhemState.relicTimers[idx].running = false;
                    mayhemState.relicEventSeq += 1;
                    mayhemState.lastRelicTrigger = {
                        seq: mayhemState.relicEventSeq,
                        index: idx,
                        id: mayhemState.relicTimers[idx].id,
                        total: -1,
                        ts: Date.now()
                    };
                } else {
                    const cd = reqTotal || (mayhemState.mapMode === 'pirate_60' ? 60 : 90);
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
                    silent: Boolean(body.lastCapturedFrame.silent),
                    ts: Date.now()
                };
            }
            if (typeof body.modalOpen === 'boolean') {
                if (body.modalOpen !== mayhemState.modalOpen) {
                    mayhemState.modalOpen = body.modalOpen;
                    mayhemState.modalEventSeq += 1;
                }
            }
            if (typeof body.minimapThumbBase64 === 'string' && body.minimapThumbBase64) {
                mayhemState.minimapThumbBase64 = body.minimapThumbBase64;
                mayhemState.minimapThumbSeq += 1;
            }
            if (typeof body.chromeTitlebarHeight === 'number' && body.chromeTitlebarHeight >= 0 && body.chromeTitlebarHeight <= 80) {
                mayhemState.chromeTitlebarHeight = Math.round(body.chromeTitlebarHeight);
            }
            if (Array.isArray(body.nativeOcrCards) && body.nativeOcrCards.length >= 3) {
                mayhemState.nativeOcrCards = body.nativeOcrCards.slice(0, 3).map(s => String(s || ''));
                mayhemState.nativeOcrSeq += 1;
            }
            if (body.lastCardClick && typeof body.lastCardClick.index === 'number') {
                mayhemState.cardClickSeq += 1;
                mayhemState.lastCardClick = {
                    seq: mayhemState.cardClickSeq,
                    index: body.lastCardClick.index,
                    isReroll: Boolean(body.lastCardClick.isReroll),
                    ts: Date.now()
                };
            }

            sendJson(res, 200, {
                status: 'ok',
                pendingActionSeq: mayhemState.pendingActionSeq,
                cardClickSeq: mayhemState.cardClickSeq,
                capturedFrameSeq: mayhemState.capturedFrameSeq,
                modalOpen: mayhemState.modalOpen,
                modalEventSeq: mayhemState.modalEventSeq,
                nativeOcrSeq: mayhemState.nativeOcrSeq,
                minimapThumbSeq: mayhemState.minimapThumbSeq,
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
