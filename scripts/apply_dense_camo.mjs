import fs from 'fs';

let html = fs.readFileSync('2fa.html', 'utf8');

// Generate 32 dense rows of cyber security microprint matrix
const glyphs = ['α', 'β', 'γ', 'δ', 'ε', 'λ', 'μ', 'π', 'σ', 'Ω', '∆', '§', '::', '·', '#', '0x7F', '0x9B', '0x12', '0xA4', '0xC1', '0x3F', '0x5E', 'SEC-01', 'AUTH-CORE', 'SHA256', 'NODE-VN', '2FA-GATE', 'CONFIDENTIAL', 'PASSION-V2', 'ENCRYPT-GCM', 'SYS-APAC'];
let matrixRowsHtml = '';
for (let r = 0; r < 32; r++) {
  let line = [];
  for (let c = 0; c < 14; c++) {
    const item = glyphs[(r * 7 + c * 3) % glyphs.length];
    line.push(item);
  }
  matrixRowsHtml += '            <div class="flex justify-between whitespace-nowrap overflow-hidden opacity-90"><span>' + line.slice(0, 7).join('  ·  ') + '</span><span>' + line.slice(7).join('  ·  ') + '</span></div>\n';
}

const oldWatermark = /<!-- Subtle Security Watermark Glyph Matrix[\s\S]*?<!-- STEALTH SECURITY 1-CHAR TRIGGER/;

const newWatermark = `<!-- Full-Screen Dense Security Glyph Matrix & Camouflage (Che lấp toàn bộ 100% màn hình) -->
        <div class="login-grain-overlay pointer-events-none absolute inset-0 opacity-50"></div>
        <div class="pointer-events-none absolute inset-0 p-3 sm:p-5 flex flex-col justify-between font-mono text-[9px] sm:text-[10px] text-white/[0.045] select-none tracking-widest overflow-hidden leading-relaxed">
${matrixRowsHtml}        </div>
        <!-- 4 GÓC TÀNG HÌNH & 3 DECOY NGỤY TRANG (Tất cả 4 góc đều có ký tự mờ y hệt nhau, triệt tiêu 100% khả năng bị nhìn thấy) -->
        <div id="stealthDecoy0" onclick="handleStealthFailure()" class="fixed z-[120] text-[11px] font-mono text-white/[0.10] select-none tracking-widest font-bold cursor-default" title=""></div>
        <div id="stealthDecoy1" onclick="handleStealthFailure()" class="fixed z-[120] text-[11px] font-mono text-white/[0.10] select-none tracking-widest font-bold cursor-default" title=""></div>
        <div id="stealthDecoy2" onclick="handleStealthFailure()" class="fixed z-[120] text-[11px] font-mono text-white/[0.10] select-none tracking-widest font-bold cursor-default" title=""></div>
        <!-- STEALTH SECURITY 1-CHAR TRIGGER`;

if (!oldWatermark.test(html)) {
  console.error('Could not find oldWatermark target');
  process.exit(1);
}

html = html.replace(oldWatermark, newWatermark);

// Now update initStealthKey() to configure stealthDecoy0, 1, 2
const oldInitStealthKey = /function initStealthKey\(\) \{[\s\S]*?rapidKeystrokeStreak = 0;/;

const newInitStealthKey = `function initStealthKey() {
            let nextKey = currentStealthKey;
            while (nextKey === currentStealthKey) {
                nextKey = STEALTH_POOL[Math.floor(Math.random() * STEALTH_POOL.length)];
            }
            currentStealthKey = nextKey;

            // Random 1 trong 4 góc (Trái trên, Phải trên, Trái dưới, Phải dưới)
            const cornerIdx = Math.floor(Math.random() * STEALTH_CORNERS.length);
            currentStealthCornerIndex = cornerIdx;
            const corner = STEALTH_CORNERS[cornerIdx];

            const el = document.getElementById('stealthPassTrigger');
            if (el) {
                el.innerText = currentStealthKey;
                el.style.top = corner.top;
                el.style.bottom = corner.bottom;
                el.style.left = corner.left;
                el.style.right = corner.right;
                el.classList.remove('text-emerald-400', 'scale-125', 'text-rose-500', 'text-white/40', 'text-white/50');
                el.classList.add('text-white/[0.10]');
            }

            // Gán 3 góc còn lại cho 3 Decoy ngụy trang (Font, cỡ, độ mờ y chang 100% phím thật)
            const remainingCornerIndices = [0, 1, 2, 3].filter(idx => idx !== cornerIdx);
            for (let i = 0; i < 3; i++) {
                const decoyEl = document.getElementById('stealthDecoy' + i);
                if (decoyEl) {
                    const c = STEALTH_CORNERS[remainingCornerIndices[i]];
                    let decoyChar = STEALTH_POOL[Math.floor(Math.random() * STEALTH_POOL.length)];
                    while (decoyChar === currentStealthKey) {
                        decoyChar = STEALTH_POOL[Math.floor(Math.random() * STEALTH_POOL.length)];
                    }
                    decoyEl.innerText = decoyChar;
                    decoyEl.style.top = c.top;
                    decoyEl.style.bottom = c.bottom;
                    decoyEl.style.left = c.left;
                    decoyEl.style.right = c.right;
                    decoyEl.className = 'fixed z-[120] text-[11px] font-mono text-white/[0.10] select-none tracking-widest font-bold cursor-default transition-all duration-300';
                }
            }
        }

        function handleStealthFailure() {
            // Khi bấm/gõ sai hoặc bấm nhầm Decoy: Lập tức đổi sang kí tự mới và đổi góc mới hoàn toàn!
            initStealthKey();

            const now = Date.now();
            if (now - lastKeystrokeTime < 450) {
                rapidKeystrokeStreak++;
            } else {
                rapidKeystrokeStreak = 1;
            }
            lastKeystrokeTime = now;

            // Nếu phát hiện spam phím nhanh (> 2 phím liên tiếp trong < 450ms)
            if (rapidKeystrokeStreak >= 2) {
                triggerAntiSpamLockout();
            }
        }

        function triggerAntiSpamLockout() {
            isStealthLocked = true;
            const passInput = document.getElementById('passcodeInput');
            const err = document.getElementById('loginError');
            if (passInput) {
                passInput.disabled = true;
                passInput.classList.add('animate-shake', '!border-rose-500');
            }
            if (err) {
                err.classList.remove('hidden');
                err.innerText = "Phát hiện spam phím: Tạm khóa 3 giây...";
            }
            showToast('Phát hiện spam phím! Đã đổi mật mã và khóa 3s', 'error', 2500);

            setTimeout(() => {
                isStealthLocked = false;
                rapidKeystrokeStreak = 0;`;

if (!oldInitStealthKey.test(html)) {
  console.error('Could not find oldInitStealthKey target');
  process.exit(1);
}

html = html.replace(oldInitStealthKey, newInitStealthKey);

fs.writeFileSync('2fa.html', html, 'utf8');
console.log('Successfully updated 2fa.html with dense full-screen matrix and 4-corner decoy camouflage!');
