import { execFile } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * Universal Headless Browser Adapter supporting:
 * 1. Lightpanda (via CDP ws://127.0.0.1:9222 or Docker / WSL / CLI) - Ultra-lightweight (Zig-based, ~10MB RAM)
 * 2. Chrome / Edge Headless (Native fallback for Windows / visual screenshots)
 */
export async function launchBrowser({
    url = 'about:blank',
    cdpPort = 9234,
    preferredEngine = 'lightpanda', // 'lightpanda' | 'chrome' | 'edge' | 'auto'
    windowSize = '1600,1050',
    tempProfileDir = null
} = {}) {
    // 1. Kiểm tra xem Lightpanda CDP Server đã được bật sẵn chưa (Port 9222 mặc định của Lightpanda)
    const lightpandaPorts = [9222, cdpPort];
    for (const p of lightpandaPorts) {
        try {
            const res = await fetch(`http://127.0.0.1:${p}/json/version`, { signal: AbortSignal.timeout(1000) });
            if (res.ok) {
                const data = await res.json();
                const isLightpanda = (data.Browser || '').toLowerCase().includes('lightpanda');
                const engineName = isLightpanda ? 'lightpanda' : 'existing_cdp';
                console.log(`[BROWSER ADAPTER] 🚀 Kết nối CDP Server đang chạy: ${data.Browser || 'CDP Server'} (Engine: ${engineName}, Port ${p})`);
                return {
                    engine: engineName,
                    port: p,
                    process: null,
                    isRemote: true
                };
            }
        } catch (e) {
            // Port không mở, tiếp tục kiểm tra
        }
    }

    // 2. Nếu ưu tiên Lightpanda và có binary cục bộ hoặc qua biến môi trường LIGHTPANDA_EXECUTABLE_PATH
    if (preferredEngine === 'lightpanda' || preferredEngine === 'auto') {
        const customLpPath = process.env.LIGHTPANDA_EXECUTABLE_PATH;
        if (customLpPath && fs.existsSync(customLpPath)) {
            console.log(`[BROWSER ADAPTER] 🚀 Khởi chạy Lightpanda Engine từ: ${customLpPath}`);
            const lpProc = execFile(customLpPath, ['serve', `--port=${cdpPort}`]);
            await new Promise(r => setTimeout(r, 1500));
            return {
                engine: 'lightpanda',
                port: cdpPort,
                process: lpProc,
                isRemote: false
            };
        }
    }

    // 3. Dự phòng máy chủ cục bộ Chrome / Edge (Native Fallback trên Windows)
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const browserBin = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

    if (!browserBin) {
        throw new Error("Không tìm thấy Lightpanda CDP (port 9222) và cũng không tìm thấy Chrome/Edge trên máy.");
    }

    const engineName = browserBin.includes('Chrome') ? 'chrome' : 'edge';
    console.log(`[BROWSER ADAPTER] ⚡ Sử dụng Headless Fallback: ${engineName.toUpperCase()} (${browserBin})`);

    const profileDir = tempProfileDir || path.join(process.cwd(), '.tmp_browser_profile');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    const proc = execFile(browserBin, [
        '--headless=new',
        '--disable-gpu',
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${profileDir}`,
        `--window-size=${windowSize}`,
        url
    ]);

    // Chờ CDP mở cổng
    await new Promise(r => setTimeout(r, 2000));

    return {
        engine: engineName,
        port: cdpPort,
        process: proc,
        isRemote: false
    };
}

/**
 * Kết nối CDP WebSocket và cung cấp helper sendCdp
 */
export async function connectSession(browserInfo, targetUrl = null) {
    let targets = null;
    for (let retry = 0; retry < 15; retry++) {
        try {
            targets = await fetch(`http://127.0.0.1:${browserInfo.port}/json`).then(r => r.json());
            if (targets && targets.length > 0) break;
        } catch (e) {
            await new Promise(r => setTimeout(r, 200));
        }
    }
    if (!targets) {
        targets = await fetch(`http://127.0.0.1:${browserInfo.port}/json`).then(r => r.json());
    }
    let pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget) {
        // Tạo target mới nếu chưa có
        try {
            const createUrl = targetUrl ? `http://127.0.0.1:${browserInfo.port}/json/new?${encodeURIComponent(targetUrl)}` : `http://127.0.0.1:${browserInfo.port}/json/new`;
            pageTarget = await fetch(createUrl, { method: 'PUT' }).then(r => r.json());
        } catch (e) {
            targets = await fetch(`http://127.0.0.1:${browserInfo.port}/json`).then(r => r.json());
            pageTarget = targets[0];
        }
    }

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
        throw new Error(`Không lấy được WebSocket Debugger URL từ CDP port ${browserInfo.port}`);
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

    const sendCdp = (method, params = {}) => {
        return new Promise((resolve, reject) => {
            const id = Math.floor(Math.random() * 1000000);
            const handler = (evt) => {
                try {
                    const data = JSON.parse(evt.data);
                    if (data.id === id) {
                        ws.removeEventListener('message', handler);
                        if (data.error) {
                            reject(new Error(data.error.message || JSON.stringify(data.error)));
                        } else {
                            resolve(data.result);
                        }
                    }
                } catch (err) {}
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    };

    return { ws, sendCdp, pageTarget };
}
