using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace PassionMayhemDesktop
{
    internal static class NativeMethods
    {
        public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);

        public const uint SWP_NOSIZE = 0x0001;
        public const uint SWP_NOMOVE = 0x0002;
        public const uint SWP_NOACTIVATE = 0x0010;
        public const uint SWP_SHOWWINDOW = 0x0040;

        public const int SW_HIDE = 0;
        public const int SW_SHOW = 5;
        public const int SW_RESTORE = 9;
        public const int SW_SHOWNOACTIVATE = 4;

        public const int WM_CLOSE = 0x0010;
        public const int WM_SETICON = 0x0080;
        public const int WM_HOTKEY = 0x0312;

        public const int ICON_SMALL = 0;
        public const int ICON_BIG = 1;

        public const int GWL_EXSTYLE = -20;
        public const int WS_EX_TRANSPARENT = 0x00000020;
        public const int WS_EX_TOOLWINDOW = 0x00000080;
        public const int WS_EX_LAYERED = 0x00080000;
        public const int WS_EX_NOACTIVATE = 0x08000000;

        public const uint MOD_ALT = 0x0001;
        public const uint MOD_CONTROL = 0x0002;
        public const uint MOD_SHIFT = 0x0004;
        public const uint MOD_NOREPEAT = 0x4000;

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int X;
            public int Y;
        }

        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("kernel32.dll")]
        public static extern uint GetCurrentThreadId();

        [DllImport("user32.dll")]
        public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

        [DllImport("user32.dll")]
        public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll")]
        public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool PostMessage(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);
    }

    internal sealed class RelicTimerModel
    {
        public string id = "";
        public string label = "";
        public string shortName = "";
        public double nx = 0.5;
        public double ny = 0.5;
        public int remaining = 0;
        public int total = 60;
        public bool running = false;
        public int visibleStreak = 0;
        public int missingStreak = 0;
    }

    internal sealed class MinimapConfigModel
    {
        public double scale = 1.0;
        public int sizePx = 260;
        public int offsetX = 16;
        public int offsetY = 16;
        public bool flipped = false;
        public bool autoDetect = true;
        public bool calibrateMode = false;
        public bool showMinimapOverlay = true;
        public bool showHudOverlay = true;
        public bool autoWatchPixels = true;
        public int gameWidth = 1920;
        public int gameHeight = 1080;
        public string detectedSource = "default";
    }

    internal sealed class AdvisorSummaryModel
    {
        public string champName = "Vi";
        public string champTier = "S";
        public string bestAugment = "";
        public int bestScore = 0;
        public string nextItemsText = "";
        public string tacticalNote = "";
    }

    internal sealed class MinimapOverlayForm : Form
    {
        private static readonly Color KEY_COLOR = Color.FromArgb(1, 2, 3);

        private readonly MayhemControllerForm owner;
        private MinimapConfigModel cfg = new MinimapConfigModel();
        private List<RelicTimerModel> relics = new List<RelicTimerModel>();
        private bool isDragging = false;
        private bool isResizing = false;
        private Point dragStartScreen;
        private Rectangle dragStartBounds;

        public MinimapOverlayForm(MayhemControllerForm ownerForm)
        {
            owner = ownerForm;
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = KEY_COLOR;
            TransparencyKey = KEY_COLOR;
            DoubleBuffered = true;
            Width = 260;
            Height = 260;

            MouseDown += OnOverlayMouseDown;
            MouseMove += OnOverlayMouseMove;
            MouseUp += OnOverlayMouseUp;
            MouseWheel += OnOverlayMouseWheel;
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= NativeMethods.WS_EX_TOOLWINDOW | NativeMethods.WS_EX_LAYERED | NativeMethods.WS_EX_NOACTIVATE | NativeMethods.WS_EX_TRANSPARENT;
                return cp;
            }
        }

        protected override bool ShowWithoutActivation
        {
            get { return true; }
        }

        public void UpdateData(MinimapConfigModel newCfg, List<RelicTimerModel> newRelics, Rectangle gameBounds)
        {
            cfg = newCfg;
            relics = newRelics;

            int sz = Math.Max(120, Math.Min(680, cfg.sizePx));
            int targetX = cfg.flipped
                ? gameBounds.Left + cfg.offsetX
                : gameBounds.Right - sz - cfg.offsetX;
            int targetY = gameBounds.Bottom - sz - cfg.offsetY;

            if (!isDragging && !isResizing)
            {
                if (Left != targetX || Top != targetY || Width != sz || Height != sz)
                {
                    SetBounds(targetX, targetY, sz, sz);
                }
            }

            ApplyClickThrough(!cfg.calibrateMode);
            Invalidate();
        }

        private void ApplyClickThrough(bool clickThrough)
        {
            if (!IsHandleCreated) return;
            int exStyle = NativeMethods.GetWindowLong(Handle, NativeMethods.GWL_EXSTYLE);
            if (clickThrough)
            {
                int target = exStyle | NativeMethods.WS_EX_TRANSPARENT | NativeMethods.WS_EX_NOACTIVATE | NativeMethods.WS_EX_LAYERED | NativeMethods.WS_EX_TOOLWINDOW;
                if (target != exStyle) NativeMethods.SetWindowLong(Handle, NativeMethods.GWL_EXSTYLE, target);
            }
            else
            {
                int target = (exStyle & ~NativeMethods.WS_EX_TRANSPARENT) | NativeMethods.WS_EX_LAYERED | NativeMethods.WS_EX_TOOLWINDOW;
                if (target != exStyle) NativeMethods.SetWindowLong(Handle, NativeMethods.GWL_EXSTYLE, target);
            }
        }

        private void OnOverlayMouseDown(object sender, MouseEventArgs e)
        {
            if (!cfg.calibrateMode || e.Button != MouseButtons.Left) return;
            dragStartScreen = Control.MousePosition;
            dragStartBounds = Bounds;
            if (e.X >= Width - 26 && e.Y >= Height - 26)
            {
                isResizing = true;
            }
            else
            {
                isDragging = true;
            }
        }

        private void OnOverlayMouseMove(object sender, MouseEventArgs e)
        {
            if (!cfg.calibrateMode) return;
            if (isResizing)
            {
                Point cur = Control.MousePosition;
                int dx = cur.X - dragStartScreen.X;
                int dy = cur.Y - dragStartScreen.Y;
                int delta = Math.Abs(dx) > Math.Abs(dy) ? dx : dy;
                int newSz = Math.Max(120, Math.Min(680, dragStartBounds.Width + delta));
                Width = newSz;
                Height = newSz;
                Invalidate();
            }
            else if (isDragging)
            {
                Point cur = Control.MousePosition;
                Left = dragStartBounds.Left + (cur.X - dragStartScreen.X);
                Top = dragStartBounds.Top + (cur.Y - dragStartScreen.Y);
            }
            else
            {
                Cursor = (e.X >= Width - 26 && e.Y >= Height - 26) ? Cursors.SizeNWSE : Cursors.SizeAll;
            }
        }

        private void OnOverlayMouseUp(object sender, MouseEventArgs e)
        {
            if (!isDragging && !isResizing) return;
            isDragging = false;
            isResizing = false;
            owner.CommitCalibratedMinimapBounds(Bounds);
        }

        private void OnOverlayMouseWheel(object sender, MouseEventArgs e)
        {
            if (!cfg.calibrateMode) return;
            int step = e.Delta > 0 ? 8 : -8;
            int newSz = Math.Max(120, Math.Min(680, Width + step));
            int diff = newSz - Width;
            SetBounds(Left - (cfg.flipped ? 0 : diff), Top - diff, newSz, newSz);
            owner.CommitCalibratedMinimapBounds(Bounds);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;

            int w = Width;
            int h = Height;

            if (cfg.calibrateMode)
            {
                using (SolidBrush dimBrush = new SolidBrush(Color.FromArgb(80, 10, 20, 40)))
                {
                    g.FillRectangle(dimBrush, 0, 0, w, h);
                }
                using (Pen borderPen = new Pen(Color.FromArgb(255, 10, 200, 185), 3f))
                {
                    borderPen.DashStyle = DashStyle.Dash;
                    g.DrawRectangle(borderPen, 2, 2, w - 5, h - 5);
                }
                using (Pen bridgePen = new Pen(Color.FromArgb(140, 200, 155, 60), 2f))
                {
                    g.DrawLine(bridgePen, (int)(w * 0.14), (int)(h * 0.86), (int)(w * 0.86), (int)(h * 0.14));
                }
                using (SolidBrush gripBrush = new SolidBrush(Color.FromArgb(245, 200, 155, 60)))
                {
                    g.FillRectangle(gripBrush, w - 20, h - 20, 18, 18);
                }
                using (Font f = new Font("Segoe UI", 8.5f, FontStyle.Bold))
                using (SolidBrush bg = new SolidBrush(Color.FromArgb(215, 5, 8, 20)))
                using (SolidBrush fg = new SolidBrush(Color.FromArgb(255, 103, 232, 249)))
                {
                    string txt = string.Format("Kéo đặt vào Minimap • Lăn chuột Scale ({0}px) • Alt+Shift+C khóa", w);
                    SizeF sz = g.MeasureString(txt, f);
                    g.FillRectangle(bg, 4, 4, Math.Min(w - 8, sz.Width + 8), sz.Height + 4);
                    g.DrawString(txt, f, fg, new RectangleF(7, 6, w - 12, sz.Height + 2));
                }
            }

            // Proportional scaling for relic circles and fonts relative to minimap sizePx
            float radius = Math.Max(11f, w * 0.068f);
            float fontSize = Math.Max(7.5f, w * 0.038f);
            using (Font timeFont = new Font("Consolas", fontSize, FontStyle.Bold))
            using (StringFormat sf = new StringFormat())
            {
                sf.Alignment = StringAlignment.Center;
                sf.LineAlignment = StringAlignment.Center;

                for (int i = 0; i < relics.Count; i++)
                {
                    RelicTimerModel r = relics[i];
                    float cx = (float)(r.nx * w);
                    float cy = (float)(r.ny * h);

                    bool isSoon = r.running && r.remaining <= 15 && r.remaining > 0;
                    Color ringColor = r.running
                        ? (isSoon ? Color.FromArgb(255, 250, 204, 21) : Color.FromArgb(255, 56, 189, 248))
                        : Color.FromArgb(255, 52, 211, 153);
                    Color fillColor = r.running
                        ? Color.FromArgb(215, 8, 15, 32)
                        : Color.FromArgb(200, 6, 48, 36);

                    RectangleF circleRect = new RectangleF(cx - radius, cy - radius, radius * 2f, radius * 2f);
                    using (SolidBrush fillBrush = new SolidBrush(fillColor))
                    {
                        g.FillEllipse(fillBrush, circleRect);
                    }

                    using (Pen bgRing = new Pen(Color.FromArgb(140, 30, 41, 59), 2.5f))
                    {
                        g.DrawEllipse(bgRing, circleRect);
                    }

                    float sweep = 360f;
                    if (r.running && r.total > 0)
                    {
                        sweep = Math.Max(8f, Math.Min(360f, (float)((r.total - r.remaining) * 360.0 / r.total)));
                    }
                    using (Pen arcPen = new Pen(ringColor, Math.Max(2.2f, w * 0.011f)))
                    {
                        g.DrawArc(arcPen, circleRect, -90f, sweep);
                    }

                    string labelText = r.running ? r.remaining.ToString() : "OK";
                    using (SolidBrush textBrush = new SolidBrush(ringColor))
                    {
                        g.DrawString(labelText, timeFont, textBrush, circleRect, sf);
                    }
                }
            }
        }
    }

    internal sealed class HudOverlayForm : Form
    {
        private readonly MayhemControllerForm owner;
        private AdvisorSummaryModel summary = new AdvisorSummaryModel();
        private string mapMode = "pirate_60";
        private List<RelicTimerModel> relics = new List<RelicTimerModel>();
        private bool isDragging = false;
        private Point dragStartScreen;
        private Point dragStartLoc;

        public HudOverlayForm(MayhemControllerForm ownerForm)
        {
            owner = ownerForm;
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.FromArgb(9, 14, 28);
            Opacity = 0.89;
            Width = 330;
            Height = 148;
            Left = 18;
            Top = 18;
            DoubleBuffered = true;

            MouseDown += delegate(object s, MouseEventArgs e)
            {
                if (e.Button == MouseButtons.Left)
                {
                    isDragging = true;
                    dragStartScreen = Control.MousePosition;
                    dragStartLoc = Location;
                }
            };
            MouseMove += delegate
            {
                if (isDragging)
                {
                    Point cur = Control.MousePosition;
                    Left = dragStartLoc.X + (cur.X - dragStartScreen.X);
                    Top = dragStartLoc.Y + (cur.Y - dragStartScreen.Y);
                }
            };
            MouseUp += delegate { isDragging = false; };
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= NativeMethods.WS_EX_TOOLWINDOW | NativeMethods.WS_EX_NOACTIVATE;
                return cp;
            }
        }

        protected override bool ShowWithoutActivation
        {
            get { return true; }
        }

        public void UpdateData(AdvisorSummaryModel sum, string mode, List<RelicTimerModel> relicList)
        {
            summary = sum;
            mapMode = mode;
            relics = relicList;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            using (Pen borderPen = new Pen(Color.FromArgb(190, 200, 155, 60), 1.5f))
            {
                g.DrawRectangle(borderPen, 0, 0, Width - 1, Height - 1);
            }

            using (Font fTitle = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            using (Font fBody = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (Font fBold = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (Font fSmall = new Font("Segoe UI", 7.5f, FontStyle.Regular))
            using (SolidBrush brGold = new SolidBrush(Color.FromArgb(253, 230, 138)))
            using (SolidBrush brCyan = new SolidBrush(Color.FromArgb(103, 232, 249)))
            using (SolidBrush brGreen = new SolidBrush(Color.FromArgb(110, 231, 183)))
            using (SolidBrush brMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush brWhite = new SolidBrush(Color.FromArgb(241, 245, 249)))
            {
                string mapTag = mapMode == "pirate_60" ? "Pirate 60s" : "Vực Gió Hú 90s";
                g.DrawString(string.Format("MAYHEM BLITZ • {0} ({1})", summary.champName, summary.champTier), fTitle, brGold, 10, 8);
                g.DrawString(mapTag, fBold, brCyan, Width - 96, 9);

                string augLine = string.IsNullOrEmpty(summary.bestAugment)
                    ? "Bấm Alt+Shift+Q khi hiện 3 lõi để AI chấm điểm"
                    : string.Format("★ Lõi #1: {0} ({1}đ)", summary.bestAugment, summary.bestScore);
                g.DrawString(augLine, fBold, brGreen, new RectangleF(10, 30, Width - 20, 18));

                string itemsLine = string.IsNullOrEmpty(summary.nextItemsText)
                    ? "Đồ: Đang đồng bộ từ ARAM Mayhem..."
                    : "Đồ: " + summary.nextItemsText;
                g.DrawString(itemsLine, fBody, brWhite, new RectangleF(10, 50, Width - 20, 18));

                string noteLine = string.IsNullOrEmpty(summary.tacticalNote)
                    ? "Alt+Shift+E: Quét Bảng Tab / Trận đấu"
                    : summary.tacticalNote;
                g.DrawString(noteLine, fSmall, brMuted, new RectangleF(10, 70, Width - 20, 32));

                // Compact 4 relic line at bottom
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < relics.Count; i++)
                {
                    if (i > 0) sb.Append("  |  ");
                    RelicTimerModel r = relics[i];
                    sb.Append(r.shortName);
                    sb.Append(": ");
                    sb.Append(r.running ? r.remaining + "s" : "OK");
                }
                g.DrawString(sb.ToString(), fSmall, brCyan, new RectangleF(10, 106, Width - 20, 16));
                g.DrawString("Alt+1..4: Đếm cục máu | Alt+Shift+C: Chỉnh Minimap | Alt+Shift+O: Ẩn", fSmall, brMuted, new RectangleF(10, 124, Width - 20, 16));
            }
        }
    }

    internal sealed class MayhemControllerForm : Form
    {
        private const int HK_TOGGLE_APP = 101;
        private const int HK_TOGGLE_OVERLAY = 102;
        private const int HK_TOGGLE_CALIBRATE = 103;
        private const int HK_SCAN_AUGMENTS = 104;
        private const int HK_SCAN_COMBAT = 105;
        private const int HK_RELIC_1 = 111;
        private const int HK_RELIC_2 = 112;
        private const int HK_RELIC_3 = 113;
        private const int HK_RELIC_4 = 114;

        private const string WAKE_EVENT_NAME = "Local\\PassionStar_Mayhem_Desktop_Wakeup_Event";

        private readonly string appDir;
        private readonly string iconPath;
        private readonly int serverPort;
        private readonly string baseUrl;
        private readonly JavaScriptSerializer json = new JavaScriptSerializer();

        private Process nodeProcess;
        private Process browserProcess;
        private IntPtr appHwnd = IntPtr.Zero;
        private DateTime launchTimeUtc = DateTime.UtcNow;

        private bool isHiddenToTray = false;
        private bool isShuttingDown = false;
        private bool overlaysEnabled = true;

        private MinimapConfigModel minimapCfg = new MinimapConfigModel();
        private string mapMode = "pirate_60";
        private AdvisorSummaryModel advisorSummary = new AdvisorSummaryModel();
        private List<RelicTimerModel> relics = new List<RelicTimerModel>();
        private long lastHandledPendingActionSeq = 0;

        private MinimapOverlayForm minimapForm;
        private HudOverlayForm hudForm;

        private NotifyIcon trayIcon;
        private Icon loadedTrayIcon;
        private Icon loadedBigIcon;
        private ContextMenuStrip trayMenu;
        private ToolStripMenuItem menuShowHide;
        private ToolStripMenuItem menuToggleOverlay;
        private ToolStripMenuItem menuCalibrate;
        private ToolStripMenuItem menuMapPirate;
        private ToolStripMenuItem menuMapAbyss;

        private System.Windows.Forms.Timer monitorTimer;
        private System.Windows.Forms.Timer overlayTickTimer;
        private System.Windows.Forms.Timer startupTimer;
        private Thread syncThread;
        private Thread wakeListenerThread;
        private EventWaitHandle wakeEvent;
        private readonly object syncLock = new object();

        public MayhemControllerForm()
        {
            appDir = ResolveAppDirectory();
            iconPath = Path.Combine(appDir, "icon\\2fa.ico");

            ShowInTaskbar = false;
            FormBorderStyle = FormBorderStyle.FixedToolWindow;
            WindowState = FormWindowState.Normal;
            Opacity = 0;
            Width = 1;
            Height = 1;
            Left = -32000;
            Top = -32000;
            Text = "Passion Mayhem Blitz Controller";

            InitDefaultRelics();
            serverPort = PickOrReuseServerPort();
            baseUrl = "http://127.0.0.1:" + serverPort;

            SetupTrayIcon();
            StartWakeListener();

            startupTimer = new System.Windows.Forms.Timer();
            startupTimer.Interval = 50;
            startupTimer.Tick += delegate
            {
                startupTimer.Stop();
                startupTimer.Dispose();
                Hide();
                RegisterGlobalHotKeys();
                StartDesktopApp();
            };
            startupTimer.Start();

            FormClosing += delegate { ShutdownAll(false); };
        }

        private void InitDefaultRelics()
        {
            relics.Clear();
            relics.Add(new RelicTimerModel { id = "ally_inner", label = "Trụ Trong Đồng Minh", shortName = "Trong Ta", nx = 0.25, ny = 0.75, total = 60 });
            relics.Add(new RelicTimerModel { id = "ally_outer", label = "Trụ Ngoài Đồng Minh", shortName = "Ngoài Ta", nx = 0.41, ny = 0.59, total = 60 });
            relics.Add(new RelicTimerModel { id = "enemy_outer", label = "Trụ Ngoài Đối Phương", shortName = "Ngoài Địch", nx = 0.59, ny = 0.41, total = 60 });
            relics.Add(new RelicTimerModel { id = "enemy_inner", label = "Trụ Trong Đối Phương", shortName = "Trong Địch", nx = 0.75, ny = 0.25, total = 60 });
        }

        private string ResolveAppDirectory()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            if (File.Exists(Path.Combine(exeDir, "aram-mayhem.html")) && File.Exists(Path.Combine(exeDir, "server\\server.mjs")))
            {
                return exeDir;
            }
            string parentDir = Directory.GetParent(exeDir) != null ? Directory.GetParent(exeDir).FullName : exeDir;
            if (File.Exists(Path.Combine(parentDir, "aram-mayhem.html")) && File.Exists(Path.Combine(parentDir, "server\\server.mjs")))
            {
                return parentDir;
            }
            return exeDir;
        }

        private void SetupTrayIcon()
        {
            if (File.Exists(iconPath))
            {
                try
                {
                    loadedTrayIcon = new Icon(iconPath, 16, 16);
                    loadedBigIcon = new Icon(iconPath, 32, 32);
                }
                catch
                {
                    loadedTrayIcon = SystemIcons.Application;
                    loadedBigIcon = SystemIcons.Application;
                }
            }
            else
            {
                loadedTrayIcon = SystemIcons.Application;
                loadedBigIcon = SystemIcons.Application;
            }

            trayMenu = new ContextMenuStrip();

            menuShowHide = new ToolStripMenuItem("Hiện / Ẩn ARAM Mayhem (Alt+Shift+M)");
            menuShowHide.Font = new Font(menuShowHide.Font, FontStyle.Bold);
            menuShowHide.Click += delegate { ToggleShowHide(); };

            menuToggleOverlay = new ToolStripMenuItem("Bật / Tắt Overlay Trong Game (Alt+Shift+O)");
            menuToggleOverlay.Checked = true;
            menuToggleOverlay.Click += delegate { ToggleOverlays(); };

            menuCalibrate = new ToolStripMenuItem("Căn Chỉnh & Scale Minimap (Alt+Shift+C)");
            menuCalibrate.Click += delegate { ToggleCalibrateMode(); };

            ToolStripMenuItem menuAutoScale = new ToolStripMenuItem("Tự Nhận Diện Minimap Từ Riot Config");
            menuAutoScale.Click += delegate { AutoDetectFromRiotConfig(); };

            ToolStripMenuItem menuScanAug = new ToolStripMenuItem("⚡ Chụp & Quét 3 Lõi (Alt+Shift+Q)");
            menuScanAug.Click += delegate { CaptureAndUploadFrame("scan-aug"); };

            ToolStripMenuItem menuScanTab = new ToolStripMenuItem("🔍 Chụp & Quét Bảng Tab / Trận (Alt+Shift+E)");
            menuScanTab.Click += delegate { CaptureAndUploadFrame("scan-combat"); };

            menuMapPirate = new ToolStripMenuItem("Chế độ Bản đồ Pirate (60s Máu+Mana)");
            menuMapPirate.Checked = true;
            menuMapPirate.Click += delegate { SetMapMode("pirate_60"); };

            menuMapAbyss = new ToolStripMenuItem("Chế độ Vực Gió Hú (90s)");
            menuMapAbyss.Click += delegate { SetMapMode("abyss_90"); };

            ToolStripMenuItem menuShortcut = new ToolStripMenuItem("Tạo lối tắt ngoài Desktop");
            menuShortcut.Click += delegate { CreateDesktopShortcut(true); };

            ToolStripMenuItem menuExit = new ToolStripMenuItem("Thoát hoàn toàn");
            menuExit.Click += delegate { ShutdownAll(true); };

            trayMenu.Items.Add(menuShowHide);
            trayMenu.Items.Add(menuToggleOverlay);
            trayMenu.Items.Add(menuCalibrate);
            trayMenu.Items.Add(menuAutoScale);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(menuScanAug);
            trayMenu.Items.Add(menuScanTab);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(menuMapPirate);
            trayMenu.Items.Add(menuMapAbyss);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(menuShortcut);
            trayMenu.Items.Add(menuExit);

            trayIcon = new NotifyIcon();
            trayIcon.Icon = loadedTrayIcon;
            trayIcon.Text = "Passion ARAM Mayhem Blitz Overlay";
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            trayIcon.MouseClick += delegate(object sender, MouseEventArgs e)
            {
                if (e.Button == MouseButtons.Left) ToggleShowHide();
            };
        }

        private void RegisterGlobalHotKeys()
        {
            IntPtr h = Handle;
            if (h == IntPtr.Zero) return;

            uint modAltShift = NativeMethods.MOD_ALT | NativeMethods.MOD_SHIFT | NativeMethods.MOD_NOREPEAT;
            uint modAlt = NativeMethods.MOD_ALT | NativeMethods.MOD_NOREPEAT;

            NativeMethods.RegisterHotKey(h, HK_TOGGLE_APP, modAltShift, (uint)Keys.M);
            NativeMethods.RegisterHotKey(h, HK_TOGGLE_OVERLAY, modAltShift, (uint)Keys.O);
            NativeMethods.RegisterHotKey(h, HK_TOGGLE_CALIBRATE, modAltShift, (uint)Keys.C);
            NativeMethods.RegisterHotKey(h, HK_SCAN_AUGMENTS, modAltShift, (uint)Keys.Q);
            NativeMethods.RegisterHotKey(h, HK_SCAN_COMBAT, modAltShift, (uint)Keys.E);

            NativeMethods.RegisterHotKey(h, HK_RELIC_1, modAlt, (uint)Keys.D1);
            NativeMethods.RegisterHotKey(h, HK_RELIC_2, modAlt, (uint)Keys.D2);
            NativeMethods.RegisterHotKey(h, HK_RELIC_3, modAlt, (uint)Keys.D3);
            NativeMethods.RegisterHotKey(h, HK_RELIC_4, modAlt, (uint)Keys.D4);
        }

        private void StartWakeListener()
        {
            try
            {
                bool created;
                wakeEvent = new EventWaitHandle(false, EventResetMode.AutoReset, WAKE_EVENT_NAME, out created);
                wakeListenerThread = new Thread(delegate()
                {
                    while (!isShuttingDown)
                    {
                        try
                        {
                            if (wakeEvent.WaitOne(1000))
                            {
                                if (isShuttingDown) break;
                                SafeBeginInvoke(delegate { ShowAppWindow(); });
                            }
                        }
                        catch { Thread.Sleep(500); }
                    }
                });
                wakeListenerThread.IsBackground = true;
                wakeListenerThread.Start();
            }
            catch { }
        }

        private int PickOrReuseServerPort()
        {
            HashSet<int> activePorts = GetActiveListeningPorts();
            for (int port = 3225; port <= 3235; port++)
            {
                if (activePorts.Contains(port) && CheckHealthEndpoint(port)) return port;
            }
            for (int port = 3225; port <= 3235; port++)
            {
                if (!activePorts.Contains(port) && IsPortAvailable(port)) return port;
            }
            return 3225;
        }

        private HashSet<int> GetActiveListeningPorts()
        {
            HashSet<int> set = new HashSet<int>();
            try
            {
                IPGlobalProperties props = IPGlobalProperties.GetIPGlobalProperties();
                IPEndPoint[] listeners = props.GetActiveTcpListeners();
                for (int i = 0; i < listeners.Length; i++) set.Add(listeners[i].Port);
            }
            catch { }
            return set;
        }

        private bool IsPortAvailable(int port)
        {
            try
            {
                TcpListener probe = new TcpListener(IPAddress.Loopback, port);
                probe.Start();
                probe.Stop();
                return true;
            }
            catch { return false; }
        }

        private bool CheckHealthEndpoint(int port)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/mayhem/health");
                req.Method = "GET";
                req.Proxy = null;
                req.Timeout = 450;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                using (StreamReader sr = new StreamReader(resp.GetResponseStream()))
                {
                    string body = sr.ReadToEnd();
                    return body.IndexOf("passion-mayhem-desktop", StringComparison.OrdinalIgnoreCase) >= 0;
                }
            }
            catch { return false; }
        }

        private string FindNodeExecutable()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs\\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "nodejs\\node.exe"),
                "C:\\Program Files\\nodejs\\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Antigravity\\bin\\node.exe")
            };
            for (int i = 0; i < candidates.Length; i++)
            {
                if (File.Exists(candidates[i])) return candidates[i];
            }
            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] dirs = pathEnv.Split(';');
            for (int i = 0; i < dirs.Length; i++)
            {
                string d = dirs[i].Trim();
                if (string.IsNullOrEmpty(d)) continue;
                string p = Path.Combine(d, "node.exe");
                if (File.Exists(p)) return p;
            }
            return "node.exe";
        }

        private string FindBrowserExecutable()
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            string[] candidates = new string[]
            {
                Path.Combine(pfx86, "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(pf, "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(localAppData, "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(pf, "Google\\Chrome\\Application\\chrome.exe"),
                Path.Combine(pfx86, "Google\\Chrome\\Application\\chrome.exe"),
                Path.Combine(localAppData, "Google\\Chrome\\Application\\chrome.exe")
            };
            for (int i = 0; i < candidates.Length; i++)
            {
                if (File.Exists(candidates[i])) return candidates[i];
            }
            return null;
        }

        private void StartDesktopApp()
        {
            if (!EnsureNodeServerRunning())
            {
                MessageBox.Show("Không thể khởi động máy chủ nội bộ (Node.js) trên cổng " + serverPort, "Passion Mayhem Blitz", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            AutoDetectFromRiotConfig();

            string browserExe = FindBrowserExecutable();
            if (string.IsNullOrEmpty(browserExe))
            {
                MessageBox.Show("Không tìm thấy Microsoft Edge hoặc Google Chrome.", "Passion Mayhem Blitz", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            string profileDir = Path.Combine(appDir, ".tmp_mayhem_desktop_profile");
            if (!Directory.Exists(profileDir))
            {
                try { Directory.CreateDirectory(profileDir); } catch { }
            }

            string appUrl = baseUrl + "/aram-mayhem.html?desktop=1";
            string args = string.Format(
                "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1360,880 --no-first-run --no-default-browser-check --disable-features=msEdgeSidebarV2",
                appUrl,
                profileDir
            );

            launchTimeUtc = DateTime.UtcNow;

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = browserExe;
            psi.Arguments = args;
            psi.WorkingDirectory = appDir;
            psi.UseShellExecute = false;

            try
            {
                browserProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Không thể mở cửa sổ ứng dụng: " + ex.Message, "Passion Mayhem Blitz", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            minimapForm = new MinimapOverlayForm(this);
            hudForm = new HudOverlayForm(this);

            monitorTimer = new System.Windows.Forms.Timer();
            monitorTimer.Interval = 400;
            monitorTimer.Tick += MonitorWindowTick;
            monitorTimer.Start();

            overlayTickTimer = new System.Windows.Forms.Timer();
            overlayTickTimer.Interval = 650;
            overlayTickTimer.Tick += OverlayTick;
            overlayTickTimer.Start();

            StartStateSyncThread();
        }

        private bool EnsureNodeServerRunning()
        {
            if (CheckHealthEndpoint(serverPort)) return true;

            string nodeExe = FindNodeExecutable();
            string serverScript = Path.Combine(appDir, "server\\server.mjs");
            if (!File.Exists(serverScript)) return false;

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExe;
            psi.Arguments = "\"" + serverScript + "\"";
            psi.WorkingDirectory = appDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.EnvironmentVariables["PORT"] = serverPort.ToString();

            try { nodeProcess = Process.Start(psi); }
            catch { return false; }

            DateTime deadline = DateTime.UtcNow.AddSeconds(10);
            while (DateTime.UtcNow < deadline)
            {
                if (CheckHealthEndpoint(serverPort)) return true;
                if (nodeProcess != null && nodeProcess.HasExited) return false;
                Thread.Sleep(150);
            }
            return false;
        }

        private void MonitorWindowTick(object sender, EventArgs e)
        {
            if (isShuttingDown) return;

            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd))
            {
                if (appHwnd != IntPtr.Zero && !isHiddenToTray)
                {
                    ShutdownAll(true);
                    return;
                }

                IntPtr found = FindMayhemWindowHandle();
                if (found != IntPtr.Zero)
                {
                    appHwnd = found;
                    ApplyWindowIcons(appHwnd);
                }
                else if ((DateTime.UtcNow - launchTimeUtc).TotalSeconds > 20 && browserProcess != null && browserProcess.HasExited)
                {
                    ShutdownAll(true);
                }
            }
        }

        private IntPtr FindMayhemWindowHandle()
        {
            IntPtr pidMatched = IntPtr.Zero;
            IntPtr titleMatched = IntPtr.Zero;
            int targetPid = (browserProcess != null && !browserProcess.HasExited) ? browserProcess.Id : -1;

            NativeMethods.EnumWindows(delegate(IntPtr hWnd, IntPtr lParam)
            {
                if (!NativeMethods.IsWindowVisible(hWnd)) return true;

                StringBuilder cls = new StringBuilder(64);
                NativeMethods.GetClassName(hWnd, cls, cls.Capacity);
                if (!cls.ToString().StartsWith("Chrome_WidgetWin", StringComparison.Ordinal)) return true;

                StringBuilder title = new StringBuilder(512);
                NativeMethods.GetWindowText(hWnd, title, title.Capacity);
                string titleStr = title.ToString();
                if (string.IsNullOrEmpty(titleStr) || titleStr.IndexOf("DevTools", StringComparison.OrdinalIgnoreCase) >= 0) return true;

                uint pid;
                NativeMethods.GetWindowThreadProcessId(hWnd, out pid);

                if (targetPid > 0 && (int)pid == targetPid)
                {
                    pidMatched = hWnd;
                    return false;
                }

                if (titleStr.IndexOf("ARAM: Mayhem", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    titleStr.IndexOf("127.0.0.1:" + serverPort, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    titleMatched = hWnd;
                }
                return true;
            }, IntPtr.Zero);

            return pidMatched != IntPtr.Zero ? pidMatched : titleMatched;
        }

        private IntPtr FindLeagueGameWindow(out Rectangle clientBounds, out bool isForeground)
        {
            IntPtr found = IntPtr.Zero;
            NativeMethods.EnumWindows(delegate(IntPtr hWnd, IntPtr lParam)
            {
                if (!NativeMethods.IsWindowVisible(hWnd)) return true;

                StringBuilder cls = new StringBuilder(64);
                NativeMethods.GetClassName(hWnd, cls, cls.Capacity);
                StringBuilder title = new StringBuilder(256);
                NativeMethods.GetWindowText(hWnd, title, title.Capacity);

                string clsStr = cls.ToString();
                string titleStr = title.ToString();

                if (clsStr == "RiotWindowClass" || titleStr.IndexOf("League of Legends (TM) Client", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    NativeMethods.RECT r;
                    if (NativeMethods.GetClientRect(hWnd, out r) && (r.Right - r.Left) >= 640 && (r.Bottom - r.Top) >= 480)
                    {
                        found = hWnd;
                        return false;
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (found != IntPtr.Zero)
            {
                NativeMethods.RECT cr;
                NativeMethods.GetClientRect(found, out cr);
                NativeMethods.POINT pt = new NativeMethods.POINT { X = 0, Y = 0 };
                NativeMethods.ClientToScreen(found, ref pt);
                clientBounds = new Rectangle(pt.X, pt.Y, Math.Max(640, cr.Right - cr.Left), Math.Max(480, cr.Bottom - cr.Top));
                isForeground = NativeMethods.GetForegroundWindow() == found;
                return found;
            }

            Rectangle screen = Screen.PrimaryScreen.Bounds;
            clientBounds = screen;
            isForeground = false;
            return IntPtr.Zero;
        }

        private void OverlayTick(object sender, EventArgs e)
        {
            if (isShuttingDown) return;

            Rectangle gameBounds;
            bool gameFocused;
            IntPtr leagueHwnd = FindLeagueGameWindow(out gameBounds, out gameFocused);

            bool shouldShow = overlaysEnabled && (leagueHwnd != IntPtr.Zero || minimapCfg.calibrateMode);

            lock (syncLock)
            {
                minimapCfg.gameWidth = gameBounds.Width;
                minimapCfg.gameHeight = gameBounds.Height;
                if (minimapCfg.autoDetect && !minimapCfg.calibrateMode)
                {
                    double ratioH = gameBounds.Height / 1080.0;
                    minimapCfg.sizePx = Math.Max(130, Math.Min(640, (int)Math.Round(260.0 * ratioH * minimapCfg.scale)));
                    minimapCfg.offsetX = Math.Max(4, (int)Math.Round(16.0 * ratioH));
                    minimapCfg.offsetY = Math.Max(4, (int)Math.Round(16.0 * ratioH));
                }
            }

            // Optional pixel watcher for health relics inside the League minimap
            if (shouldShow && leagueHwnd != IntPtr.Zero && gameFocused && minimapCfg.autoWatchPixels && !minimapCfg.calibrateMode)
            {
                WatchMinimapRelicPixels(gameBounds);
            }

            if (minimapForm != null && !minimapForm.IsDisposed)
            {
                if (shouldShow && minimapCfg.showMinimapOverlay)
                {
                    if (!minimapForm.Visible)
                    {
                        minimapForm.Show();
                    }
                    minimapForm.UpdateData(CloneConfig(minimapCfg), CloneRelics(relics), gameBounds);
                    NativeMethods.SetWindowPos(minimapForm.Handle, NativeMethods.HWND_TOPMOST, 0, 0, 0, 0, NativeMethods.SWP_NOMOVE | NativeMethods.SWP_NOSIZE | NativeMethods.SWP_NOACTIVATE);
                }
                else if (minimapForm.Visible)
                {
                    minimapForm.Hide();
                }
            }

            if (hudForm != null && !hudForm.IsDisposed)
            {
                if (shouldShow && minimapCfg.showHudOverlay)
                {
                    if (!hudForm.Visible)
                    {
                        hudForm.Left = gameBounds.Left + 18;
                        hudForm.Top = gameBounds.Top + 18;
                        hudForm.Show();
                    }
                    hudForm.UpdateData(advisorSummary, mapMode, CloneRelics(relics));
                    NativeMethods.SetWindowPos(hudForm.Handle, NativeMethods.HWND_TOPMOST, 0, 0, 0, 0, NativeMethods.SWP_NOMOVE | NativeMethods.SWP_NOSIZE | NativeMethods.SWP_NOACTIVATE);
                }
                else if (hudForm.Visible)
                {
                    hudForm.Hide();
                }
            }
        }

        private void WatchMinimapRelicPixels(Rectangle gameBounds)
        {
            int sz = Math.Max(120, minimapCfg.sizePx);
            int mx = minimapCfg.flipped ? gameBounds.Left + minimapCfg.offsetX : gameBounds.Right - sz - minimapCfg.offsetX;
            int my = gameBounds.Bottom - sz - minimapCfg.offsetY;
            int patch = Math.Max(6, (int)Math.Round(sz * 0.032));

            bool triggeredAny = false;
            lock (syncLock)
            {
                for (int i = 0; i < relics.Count; i++)
                {
                    RelicTimerModel r = relics[i];
                    if (r.running)
                    {
                        r.visibleStreak = 0;
                        r.missingStreak = 0;
                        continue;
                    }

                    int px = mx + (int)Math.Round(r.nx * sz) - patch / 2;
                    int py = my + (int)Math.Round(r.ny * sz) - patch / 2;

                    try
                    {
                        using (Bitmap bmp = new Bitmap(patch, patch, PixelFormat.Format24bppRgb))
                        using (Graphics g = Graphics.FromImage(bmp))
                        {
                            g.CopyFromScreen(px, py, 0, 0, new Size(patch, patch), CopyPixelOperation.SourceCopy);
                            int brightGreenCount = 0;
                            for (int x = 0; x < patch; x++)
                            {
                                for (int y = 0; y < patch; y++)
                                {
                                    Color c = bmp.GetPixel(x, y);
                                    if (c.G > 145 && c.G > c.R + 20 && c.B < 175) brightGreenCount++;
                                }
                            }
                            bool isVisible = brightGreenCount >= Math.Max(2, (patch * patch) / 8);
                            if (isVisible)
                            {
                                r.visibleStreak = Math.Min(10, r.visibleStreak + 1);
                                r.missingStreak = 0;
                            }
                            else if (r.visibleStreak >= 2)
                            {
                                r.missingStreak++;
                                if (r.missingStreak >= 2)
                                {
                                    int cd = mapMode == "pirate_60" ? 60 : 90;
                                    r.total = cd;
                                    r.remaining = cd;
                                    r.running = true;
                                    r.visibleStreak = 0;
                                    r.missingStreak = 0;
                                    triggeredAny = true;
                                    PushRelicTriggerToServer(i, cd);
                                }
                            }
                        }
                    }
                    catch { }
                }
            }

            if (triggeredAny)
            {
                // Already pushed via PushRelicTriggerToServer
            }
        }

        private void StartStateSyncThread()
        {
            syncThread = new Thread(delegate()
            {
                while (!isShuttingDown)
                {
                    try
                    {
                        string resp = HttpGet(baseUrl + "/api/mayhem/state", 1500);
                        if (!string.IsNullOrEmpty(resp))
                        {
                            Dictionary<string, object> data = json.Deserialize<Dictionary<string, object>>(resp);
                            if (data != null)
                            {
                                ApplyServerState(data);
                            }
                        }
                    }
                    catch { }
                    Thread.Sleep(550);
                }
            });
            syncThread.IsBackground = true;
            syncThread.Start();
        }

        private void ApplyServerState(Dictionary<string, object> data)
        {
            string pendingActionToRun = null;
            long pendingSeq = 0;

            lock (syncLock)
            {
                if (data.ContainsKey("mapMode") && data["mapMode"] != null)
                {
                    mapMode = Convert.ToString(data["mapMode"]);
                }

                if (data.ContainsKey("minimap") && data["minimap"] is Dictionary<string, object>)
                {
                    Dictionary<string, object> mm = (Dictionary<string, object>)data["minimap"];
                    if (mm.ContainsKey("scale")) minimapCfg.scale = Convert.ToDouble(mm["scale"]);
                    if (mm.ContainsKey("sizePx")) minimapCfg.sizePx = Convert.ToInt32(mm["sizePx"]);
                    if (mm.ContainsKey("offsetX")) minimapCfg.offsetX = Convert.ToInt32(mm["offsetX"]);
                    if (mm.ContainsKey("offsetY")) minimapCfg.offsetY = Convert.ToInt32(mm["offsetY"]);
                    if (mm.ContainsKey("flipped")) minimapCfg.flipped = Convert.ToBoolean(mm["flipped"]);
                    if (mm.ContainsKey("autoDetect")) minimapCfg.autoDetect = Convert.ToBoolean(mm["autoDetect"]);
                    if (mm.ContainsKey("calibrateMode")) minimapCfg.calibrateMode = Convert.ToBoolean(mm["calibrateMode"]);
                    if (mm.ContainsKey("showMinimapOverlay")) minimapCfg.showMinimapOverlay = Convert.ToBoolean(mm["showMinimapOverlay"]);
                    if (mm.ContainsKey("showHudOverlay")) minimapCfg.showHudOverlay = Convert.ToBoolean(mm["showHudOverlay"]);
                    if (mm.ContainsKey("autoWatchPixels")) minimapCfg.autoWatchPixels = Convert.ToBoolean(mm["autoWatchPixels"]);
                }

                if (data.ContainsKey("relicTimers") && data["relicTimers"] is object[])
                {
                    object[] arr = (object[])data["relicTimers"];
                    for (int i = 0; i < arr.Length && i < relics.Count; i++)
                    {
                        Dictionary<string, object> rt = arr[i] as Dictionary<string, object>;
                        if (rt == null) continue;
                        if (rt.ContainsKey("remaining")) relics[i].remaining = Convert.ToInt32(rt["remaining"]);
                        if (rt.ContainsKey("total")) relics[i].total = Convert.ToInt32(rt["total"]);
                        if (rt.ContainsKey("running")) relics[i].running = Convert.ToBoolean(rt["running"]);
                    }
                }

                if (data.ContainsKey("advisorSummary") && data["advisorSummary"] is Dictionary<string, object>)
                {
                    Dictionary<string, object> ad = (Dictionary<string, object>)data["advisorSummary"];
                    if (ad.ContainsKey("champName")) advisorSummary.champName = Convert.ToString(ad["champName"]);
                    if (ad.ContainsKey("champTier")) advisorSummary.champTier = Convert.ToString(ad["champTier"]);
                    if (ad.ContainsKey("bestAugment")) advisorSummary.bestAugment = Convert.ToString(ad["bestAugment"]);
                    if (ad.ContainsKey("bestScore")) advisorSummary.bestScore = Convert.ToInt32(ad["bestScore"]);
                    if (ad.ContainsKey("tacticalNote")) advisorSummary.tacticalNote = Convert.ToString(ad["tacticalNote"]);
                    if (ad.ContainsKey("nextItems") && ad["nextItems"] is object[])
                    {
                        object[] items = (object[])ad["nextItems"];
                        List<string> list = new List<string>();
                        for (int i = 0; i < items.Length && i < 4; i++) list.Add(Convert.ToString(items[i]));
                        advisorSummary.nextItemsText = string.Join(" • ", list.ToArray());
                    }
                }

                if (data.ContainsKey("pendingAction") && data["pendingAction"] is Dictionary<string, object>)
                {
                    Dictionary<string, object> pa = (Dictionary<string, object>)data["pendingAction"];
                    long seq = pa.ContainsKey("seq") ? Convert.ToInt64(pa["seq"]) : 0;
                    if (seq > lastHandledPendingActionSeq)
                    {
                        lastHandledPendingActionSeq = seq;
                        pendingSeq = seq;
                        pendingActionToRun = pa.ContainsKey("action") ? Convert.ToString(pa["action"]) : "";
                    }
                }
            }

            if (!string.IsNullOrEmpty(pendingActionToRun))
            {
                SafeBeginInvoke(delegate
                {
                    HandlePendingAction(pendingActionToRun, pendingSeq);
                });
            }
        }

        private void HandlePendingAction(string action, long seq)
        {
            ClearPendingActionOnServer(seq);
            if (action == "capture-aug" || action == "scan-aug")
            {
                CaptureAndUploadFrame("scan-aug");
            }
            else if (action == "capture-combat" || action == "scan-combat")
            {
                CaptureAndUploadFrame("scan-combat");
            }
            else if (action == "auto-detect-riot")
            {
                AutoDetectFromRiotConfig();
            }
            else if (action == "toggle-calibrate")
            {
                ToggleCalibrateMode();
            }
            else if (action == "toggle-overlay")
            {
                ToggleOverlays();
            }
        }

        private void AutoDetectFromRiotConfig()
        {
            try
            {
                string resp = HttpGet(baseUrl + "/api/mayhem/riot-config", 1500);
                if (string.IsNullOrEmpty(resp)) return;
                Dictionary<string, object> cfg = json.Deserialize<Dictionary<string, object>>(resp);
                if (cfg == null) return;

                Rectangle gameBounds;
                bool fg;
                FindLeagueGameWindow(out gameBounds, out fg);

                lock (syncLock)
                {
                    if (cfg.ContainsKey("minimapScale"))
                    {
                        double sc = Convert.ToDouble(cfg["minimapScale"]);
                        if (sc >= 0.3 && sc <= 3.0) minimapCfg.scale = sc;
                    }
                    if (cfg.ContainsKey("flipMiniMap"))
                    {
                        minimapCfg.flipped = Convert.ToBoolean(cfg["flipMiniMap"]);
                    }
                    minimapCfg.autoDetect = true;
                    minimapCfg.detectedSource = (cfg.ContainsKey("found") && Convert.ToBoolean(cfg["found"])) ? "riot-config" : "screen-ratio";
                    double ratioH = gameBounds.Height / 1080.0;
                    minimapCfg.sizePx = Math.Max(130, Math.Min(640, (int)Math.Round(260.0 * ratioH * minimapCfg.scale)));
                    minimapCfg.offsetX = Math.Max(4, (int)Math.Round(16.0 * ratioH));
                    minimapCfg.offsetY = Math.Max(4, (int)Math.Round(16.0 * ratioH));
                }
                PushMinimapToServer();
            }
            catch { }
        }

        public void CommitCalibratedMinimapBounds(Rectangle bounds)
        {
            Rectangle gameBounds;
            bool fg;
            FindLeagueGameWindow(out gameBounds, out fg);

            lock (syncLock)
            {
                minimapCfg.autoDetect = false;
                minimapCfg.sizePx = bounds.Width;
                minimapCfg.offsetY = Math.Max(0, gameBounds.Bottom - bounds.Bottom);
                minimapCfg.offsetX = minimapCfg.flipped
                    ? Math.Max(0, bounds.Left - gameBounds.Left)
                    : Math.Max(0, gameBounds.Right - bounds.Right);
                double ratioH = gameBounds.Height / 1080.0;
                minimapCfg.scale = Math.Round(bounds.Width / Math.Max(100.0, 260.0 * ratioH), 2);
                minimapCfg.detectedSource = "manual-calibrated";
            }
            PushMinimapToServer();
        }

        private void CaptureAndUploadFrame(string scanAction)
        {
            Rectangle captureRect;
            bool fg;
            FindLeagueGameWindow(out captureRect, out fg);

            try
            {
                using (Bitmap bmp = new Bitmap(captureRect.Width, captureRect.Height, PixelFormat.Format24bppRgb))
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.CopyFromScreen(captureRect.Left, captureRect.Top, 0, 0, captureRect.Size, CopyPixelOperation.SourceCopy);
                    using (MemoryStream ms = new MemoryStream())
                    {
                        bmp.Save(ms, ImageFormat.Jpeg);
                        string base64 = Convert.ToBase64String(ms.ToArray());

                        Dictionary<string, object> frameObj = new Dictionary<string, object>();
                        frameObj["base64"] = base64;
                        frameObj["mimeType"] = "image/jpeg";
                        frameObj["action"] = scanAction;

                        Dictionary<string, object> body = new Dictionary<string, object>();
                        body["lastCapturedFrame"] = frameObj;

                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            try { HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body)); } catch { }
                        });

                        if (trayIcon != null)
                        {
                            trayIcon.ShowBalloonTip(1500, "ARAM Mayhem AI", scanAction == "scan-combat" ? "Đã chụp trận đấu / Bảng Tab gửi AI phân tích..." : "Đã chụp màn hình 3 Lõi gửi AI chấm điểm...", ToolTipIcon.Info);
                        }
                    }
                }
            }
            catch { }
        }

        private void TriggerRelicHotkey(int index)
        {
            if (index < 0 || index >= relics.Count) return;
            int cd = mapMode == "pirate_60" ? 60 : 90;
            lock (syncLock)
            {
                relics[index].total = cd;
                relics[index].remaining = cd;
                relics[index].running = true;
            }
            PushRelicTriggerToServer(index, cd);
        }

        private void PushRelicTriggerToServer(int index, int totalSec)
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["triggerRelicIndex"] = index;
                    body["total"] = totalSec;
                    HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                }
                catch { }
            });
        }

        private void ToggleOverlays()
        {
            overlaysEnabled = !overlaysEnabled;
            if (menuToggleOverlay != null) menuToggleOverlay.Checked = overlaysEnabled;
        }

        private void ToggleCalibrateMode()
        {
            lock (syncLock)
            {
                minimapCfg.calibrateMode = !minimapCfg.calibrateMode;
                if (minimapCfg.calibrateMode) overlaysEnabled = true;
            }
            if (menuCalibrate != null) menuCalibrate.Checked = minimapCfg.calibrateMode;
            PushMinimapToServer();
        }

        private void SetMapMode(string mode)
        {
            mapMode = mode;
            if (menuMapPirate != null) menuMapPirate.Checked = (mode == "pirate_60");
            if (menuMapAbyss != null) menuMapAbyss.Checked = (mode == "abyss_90");

            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["mapMode"] = mode;
                    HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                }
                catch { }
            });
        }

        private void PushMinimapToServer()
        {
            MinimapConfigModel copy = CloneConfig(minimapCfg);
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    Dictionary<string, object> mm = new Dictionary<string, object>();
                    mm["scale"] = copy.scale;
                    mm["sizePx"] = copy.sizePx;
                    mm["offsetX"] = copy.offsetX;
                    mm["offsetY"] = copy.offsetY;
                    mm["flipped"] = copy.flipped;
                    mm["autoDetect"] = copy.autoDetect;
                    mm["calibrateMode"] = copy.calibrateMode;
                    mm["showMinimapOverlay"] = copy.showMinimapOverlay;
                    mm["showHudOverlay"] = copy.showHudOverlay;
                    mm["autoWatchPixels"] = copy.autoWatchPixels;
                    mm["gameWidth"] = copy.gameWidth;
                    mm["gameHeight"] = copy.gameHeight;
                    mm["detectedSource"] = copy.detectedSource;

                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["minimap"] = mm;
                    HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                }
                catch { }
            });
        }

        private void PushRelicsToServer()
        {
            List<RelicTimerModel> listCopy = CloneRelics(relics);
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    List<Dictionary<string, object>> arr = new List<Dictionary<string, object>>();
                    for (int i = 0; i < listCopy.Count; i++)
                    {
                        Dictionary<string, object> obj = new Dictionary<string, object>();
                        obj["id"] = listCopy[i].id;
                        obj["remaining"] = listCopy[i].remaining;
                        obj["total"] = listCopy[i].total;
                        obj["running"] = listCopy[i].running;
                        arr.Add(obj);
                    }
                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["relicTimers"] = arr;
                    HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                }
                catch { }
            });
        }

        private void ClearPendingActionOnServer(long seq)
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["clearPendingActionSeq"] = seq;
                    HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                }
                catch { }
            });
        }

        private MinimapConfigModel CloneConfig(MinimapConfigModel src)
        {
            return new MinimapConfigModel
            {
                scale = src.scale,
                sizePx = src.sizePx,
                offsetX = src.offsetX,
                offsetY = src.offsetY,
                flipped = src.flipped,
                autoDetect = src.autoDetect,
                calibrateMode = src.calibrateMode,
                showMinimapOverlay = src.showMinimapOverlay,
                showHudOverlay = src.showHudOverlay,
                autoWatchPixels = src.autoWatchPixels,
                gameWidth = src.gameWidth,
                gameHeight = src.gameHeight,
                detectedSource = src.detectedSource
            };
        }

        private List<RelicTimerModel> CloneRelics(List<RelicTimerModel> src)
        {
            List<RelicTimerModel> list = new List<RelicTimerModel>();
            for (int i = 0; i < src.Count; i++)
            {
                RelicTimerModel r = src[i];
                list.Add(new RelicTimerModel
                {
                    id = r.id,
                    label = r.label,
                    shortName = r.shortName,
                    nx = r.nx,
                    ny = r.ny,
                    remaining = r.remaining,
                    total = r.total,
                    running = r.running
                });
            }
            return list;
        }

        private void ApplyWindowIcons(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return;
            try
            {
                if (loadedTrayIcon != null) NativeMethods.SendMessage(hWnd, NativeMethods.WM_SETICON, new IntPtr(NativeMethods.ICON_SMALL), loadedTrayIcon.Handle);
                if (loadedBigIcon != null) NativeMethods.SendMessage(hWnd, NativeMethods.WM_SETICON, new IntPtr(NativeMethods.ICON_BIG), loadedBigIcon.Handle);
            }
            catch { }
        }

        private void ToggleShowHide()
        {
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd))
            {
                appHwnd = FindMayhemWindowHandle();
                if (appHwnd == IntPtr.Zero) return;
            }
            if (isHiddenToTray || !NativeMethods.IsWindowVisible(appHwnd)) ShowAppWindow();
            else HideToTray();
        }

        private void HideToTray()
        {
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd)) return;
            isHiddenToTray = true;
            NativeMethods.ShowWindow(appHwnd, NativeMethods.SW_HIDE);
        }

        private void ShowAppWindow()
        {
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd))
            {
                appHwnd = FindMayhemWindowHandle();
                if (appHwnd == IntPtr.Zero) return;
            }
            isHiddenToTray = false;
            NativeMethods.ShowWindow(appHwnd, NativeMethods.IsIconic(appHwnd) ? NativeMethods.SW_RESTORE : NativeMethods.SW_SHOW);
            NativeMethods.SetForegroundWindow(appHwnd);
        }

        private void CreateDesktopShortcut(bool notifyUser)
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktopPath, "ARAM Mayhem Blitz.lnk");
                string exePath = Application.ExecutablePath;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                Type shortcutType = shortcut.GetType();

                shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { appDir });
                shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "ARAM Mayhem Blitz AI & Minimap Overlay" });
                if (File.Exists(iconPath)) shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconPath + ",0" });
                shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);

                if (notifyUser && trayIcon != null)
                {
                    trayIcon.ShowBalloonTip(2500, "ARAM Mayhem Blitz", "Đã tạo lối tắt ngoài Desktop!", ToolTipIcon.Info);
                }
            }
            catch (Exception ex)
            {
                if (notifyUser) MessageBox.Show("Không thể tạo Shortcut: " + ex.Message, "Passion Mayhem Blitz", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private string HttpGet(string url, int timeoutMs)
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "GET";
            req.Proxy = null;
            req.Timeout = timeoutMs;
            req.ReadWriteTimeout = timeoutMs;
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
            {
                return sr.ReadToEnd();
            }
        }

        private void HttpPostJson(string url, string payload)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(payload);
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "POST";
            req.Proxy = null;
            req.ContentType = "application/json; charset=utf-8";
            req.ContentLength = bytes.Length;
            req.Timeout = 3000;
            using (Stream reqStream = req.GetRequestStream())
            {
                reqStream.Write(bytes, 0, bytes.Length);
            }
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            {
                resp.Close();
            }
        }

        private void SafeBeginInvoke(Action action)
        {
            try { if (IsHandleCreated && !IsDisposed) BeginInvoke(action); }
            catch { }
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == NativeMethods.WM_HOTKEY)
            {
                int id = m.WParam.ToInt32();
                if (id == HK_TOGGLE_APP) ToggleShowHide();
                else if (id == HK_TOGGLE_OVERLAY) ToggleOverlays();
                else if (id == HK_TOGGLE_CALIBRATE) ToggleCalibrateMode();
                else if (id == HK_SCAN_AUGMENTS) CaptureAndUploadFrame("scan-aug");
                else if (id == HK_SCAN_COMBAT) CaptureAndUploadFrame("scan-combat");
                else if (id == HK_RELIC_1) TriggerRelicHotkey(0);
                else if (id == HK_RELIC_2) TriggerRelicHotkey(1);
                else if (id == HK_RELIC_3) TriggerRelicHotkey(2);
                else if (id == HK_RELIC_4) TriggerRelicHotkey(3);
            }
            base.WndProc(ref m);
        }

        private void ShutdownAll(bool closeBrowserWindow)
        {
            lock (syncLock)
            {
                if (isShuttingDown) return;
                isShuttingDown = true;
            }
            try { if (monitorTimer != null) { monitorTimer.Stop(); monitorTimer.Dispose(); } } catch { }
            try { if (overlayTickTimer != null) { overlayTickTimer.Stop(); overlayTickTimer.Dispose(); } } catch { }
            try { if (minimapForm != null && !minimapForm.IsDisposed) minimapForm.Close(); } catch { }
            try { if (hudForm != null && !hudForm.IsDisposed) hudForm.Close(); } catch { }
            try
            {
                if (IsHandleCreated)
                {
                    int[] keys = new int[] { HK_TOGGLE_APP, HK_TOGGLE_OVERLAY, HK_TOGGLE_CALIBRATE, HK_SCAN_AUGMENTS, HK_SCAN_COMBAT, HK_RELIC_1, HK_RELIC_2, HK_RELIC_3, HK_RELIC_4 };
                    for (int i = 0; i < keys.Length; i++) NativeMethods.UnregisterHotKey(Handle, keys[i]);
                }
            }
            catch { }
            try { if (trayIcon != null) { trayIcon.Visible = false; trayIcon.Dispose(); } } catch { }
            if (closeBrowserWindow && appHwnd != IntPtr.Zero && NativeMethods.IsWindow(appHwnd))
            {
                try { NativeMethods.PostMessage(appHwnd, NativeMethods.WM_CLOSE, IntPtr.Zero, IntPtr.Zero); } catch { }
            }
            if (nodeProcess != null)
            {
                try { if (!nodeProcess.HasExited) nodeProcess.Kill(); nodeProcess.Dispose(); } catch { }
            }
            try { if (wakeEvent != null) wakeEvent.Close(); } catch { }
            try { Application.Exit(); } catch { }
        }
    }

    internal static class Program
    {
        private const string MUTEX_NAME = "Local\\PassionStar_Mayhem_Desktop_App_Mutex";
        private const string WAKE_EVENT_NAME = "Local\\PassionStar_Mayhem_Desktop_Wakeup_Event";

        [STAThread]
        private static void Main()
        {
            bool createdNew;
            using (Mutex mutex = new Mutex(true, MUTEX_NAME, out createdNew))
            {
                if (!createdNew)
                {
                    try
                    {
                        using (EventWaitHandle wake = EventWaitHandle.OpenExisting(WAKE_EVENT_NAME))
                        {
                            wake.Set();
                        }
                    }
                    catch { }
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MayhemControllerForm());
            }
        }
    }
}
