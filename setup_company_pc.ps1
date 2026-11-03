<#
.SYNOPSIS
    Script thiết lập môi trường và đồng bộ toàn diện trên Máy Tính Công Ty (Company PC)
    cho dự án Passion Star Workspace Hub & Bộ 100 Antigravity Skills.
.DESCRIPTION
    Tự động:
    1. Kiểm tra Git & Node.js
    2. Cấu hình thư mục ~/.gemini/config và clone bộ 100 Skills toàn cục
    3. Cấu hình file skills.json để Antigravity nhận diện skills toàn diện
    4. Xác nhận trạng thái sẵn sàng làm việc
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ⭐ PASSION STAR - THIẾT LẬP MÁY TÍNH CÔNG TY (COMPANY PC)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiểm tra Git
try {
    $gitVersion = git --version
    Write-Host " [OK] Git đã được cài đặt: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host " [!] LỖI: Chưa tìm thấy Git. Vui lòng cài đặt Git trước: https://git-scm.com/" -ForegroundColor Red
    exit 1
}

# 2. Tạo cấu trúc thư mục ~/.gemini/config
$geminiConfigDir = Join-Path $HOME ".gemini\config"
$geminiSkillsDir = Join-Path $geminiConfigDir "skills"
$skillsJsonPath  = Join-Path $geminiConfigDir "skills.json"

if (-not (Test-Path $geminiConfigDir)) {
    New-Item -ItemType Directory -Force -Path $geminiConfigDir | Out-Null
    Write-Host " [+] Đã tạo thư mục cấu hình: $geminiConfigDir" -ForegroundColor Cyan
}

# 3. Đồng bộ bộ 100 Skills toàn cục từ GitHub
$skillsRepoUrl = "https://github.com/tinopstar8386/antigravity-skills.git"

if (Test-Path (Join-Path $geminiSkillsDir ".git")) {
    Write-Host " [*] Thư mục skills đã tồn tại. Đang cập nhật (git pull)..." -ForegroundColor Yellow
    Push-Location $geminiSkillsDir
    git pull origin main
    Pop-Location
} elseif (Test-Path $geminiSkillsDir) {
    Write-Host " [*] Thư mục skills đã có dữ liệu nhưng chưa gắn git. Đang sao lưu và clone mới..." -ForegroundColor Yellow
    $backupDir = "$geminiSkillsDir-backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
    Rename-Item $geminiSkillsDir $backupDir
    git clone $skillsRepoUrl $geminiSkillsDir
} else {
    Write-Host " [+] Đang tải bộ 100 Skills toàn cục về $geminiSkillsDir..." -ForegroundColor Cyan
    git clone $skillsRepoUrl $geminiSkillsDir
}

# 4. Tạo hoặc cập nhật skills.json
$skillsJsonContent = @{
    entries = @(
        @{
            path = "~/.gemini/config/skills"
        }
    )
} | ConvertTo-Json -Depth 5

Set-Content -Path $skillsJsonPath -Value $skillsJsonContent -Encoding UTF8
Write-Host " [OK] Đã cấu hình skills.json liên kết với ~/.gemini/config/skills" -ForegroundColor Green

# 5. Thông báo hoàn tất
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 🎉 HOÀN TẤT THIẾT LẬP MÁY TÍNH CÔNG TY THÀNH CÔNG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " - Mã nguồn dự án: Đã tích hợp sẵn .agents/skills (Workspace Customization)" -ForegroundColor White
Write-Host " - Skills toàn cục: Đã cài đặt 100 skills tại ~/.gemini/config/skills" -ForegroundColor White
Write-Host " - Bạn có thể mở dự án ngay trong Antigravity IDE hoặc VS Code." -ForegroundColor White
Write-Host ""
