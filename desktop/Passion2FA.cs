using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
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

namespace PassionStarDesktop
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
        public const int SW_SHOWNORMAL = 1;
        public const int SW_SHOW = 5;
        public const int SW_RESTORE = 9;

        public const int WM_CLOSE = 0x0010;
        public const int WM_SETICON = 0x0080;
        public const int WM_HOTKEY = 0x0312;

        public const int ICON_SMALL = 0;
        public const int ICON_BIG = 1;

        public const uint MOD_ALT = 0x0001;
        public const uint MOD_CONTROL = 0x0002;
        public const uint MOD_SHIFT = 0x0004;
        public const uint MOD_NOREPEAT = 0x4000;

        public const uint VK_OEM_3 = 0xC0;

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

    internal sealed class DesktopControllerForm : Form
    {
        private const int HOTKEY_TOGGLE_VISIBLE = 1;
        private const int HOTKEY_TOGGLE_TOPMOST = 2;
        private const int HOTKEY_TOGGLE_BOSSKEY = 3;

        private const string WAKE_EVENT_NAME = "Local\\PassionStar_2FA_Desktop_Wakeup_Event";

        private readonly string appDir;
        private readonly string iconPath;
        private readonly int serverPort;
        private readonly string baseUrl;
        private readonly JavaScriptSerializer json = new JavaScriptSerializer();

        private Process nodeProcess;
        private Process browserProcess;
        private IntPtr appHwnd = IntPtr.Zero;
        private DateTime launchTimeUtc = DateTime.UtcNow;

        private bool alwaysOnTop = false;
        private bool isHiddenToTray = false;
        private bool bossMode = false;
        private bool hasShownTrayBalloon = false;
        private bool isShuttingDown = false;
        private long nativeCommandSeq = 0;

        private NotifyIcon trayIcon;
        private Icon loadedTrayIcon;
        private Icon loadedBigIcon;
        private ContextMenuStrip trayMenu;
        private ToolStripMenuItem menuShowHide;
        private ToolStripMenuItem menuTopMost;
        private ToolStripMenuItem menuBossKey;
        private ToolStripMenuItem menuLockPin;
        private ToolStripMenuItem menuShortcut;
        private ToolStripMenuItem menuExit;

        private System.Windows.Forms.Timer monitorTimer;
        private System.Windows.Forms.Timer startupTimer;
        private Thread commandPollThread;
        private Thread wakeListenerThread;
        private EventWaitHandle wakeEvent;
        private readonly object syncLock = new object();

        public DesktopControllerForm()
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
            Text = "Passion 2FA Desktop Controller";

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

            FormClosing += delegate
            {
                ShutdownAll(false);
            };
        }

        private string ResolveAppDirectory()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            if (File.Exists(Path.Combine(exeDir, "2fa.html")) && File.Exists(Path.Combine(exeDir, "server\\server.mjs")))
            {
                return exeDir;
            }
            string parentDir = Directory.GetParent(exeDir) != null ? Directory.GetParent(exeDir).FullName : exeDir;
            if (File.Exists(Path.Combine(parentDir, "2fa.html")) && File.Exists(Path.Combine(parentDir, "server\\server.mjs")))
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
                    loadedTrayIcon = SystemIcons.Shield;
                    loadedBigIcon = SystemIcons.Shield;
                }
            }
            else
            {
                loadedTrayIcon = SystemIcons.Shield;
                loadedBigIcon = SystemIcons.Shield;
            }

            trayMenu = new ContextMenuStrip();

            menuShowHide = new ToolStripMenuItem("Ẩn xuống khay / Hiện Passion 2FA (Alt+Shift+A)");
            menuShowHide.Font = new Font(menuShowHide.Font, FontStyle.Bold);
            menuShowHide.Click += delegate { ToggleShowHide(); };

            menuTopMost = new ToolStripMenuItem("Ghim nổi trên cùng - Always on Top (Alt+Shift+T)");
            menuTopMost.Click += delegate { ToggleTopMostFromNative(); };

            menuBossKey = new ToolStripMenuItem("Ngụy trang Boss Key (Alt+~ / Ctrl+F1)");
            menuBossKey.Click += delegate { ToggleBossKeyFromNative(); };

            menuLockPin = new ToolStripMenuItem("Khóa bảo mật PIN ngay");
            menuLockPin.Click += delegate { SendLockPinCommand(); };

            menuShortcut = new ToolStripMenuItem("Tạo lối tắt (Shortcut) ra ngoài Desktop");
            menuShortcut.Click += delegate { CreateDesktopShortcut(true); };

            menuExit = new ToolStripMenuItem("Thoát hoàn toàn (Exit)");
            menuExit.Click += delegate { ShutdownAll(true); };

            trayMenu.Items.Add(menuShowHide);
            trayMenu.Items.Add(menuTopMost);
            trayMenu.Items.Add(menuBossKey);
            trayMenu.Items.Add(menuLockPin);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(menuShortcut);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(menuExit);

            trayIcon = new NotifyIcon();
            trayIcon.Icon = loadedTrayIcon;
            trayIcon.Text = "Passion 2FA Security Hub (Desktop App)";
            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            trayIcon.MouseClick += delegate(object sender, MouseEventArgs e)
            {
                if (e.Button == MouseButtons.Left)
                {
                    ToggleShowHide();
                }
            };
        }

        private void RegisterGlobalHotKeys()
        {
            // Force handle creation before registering hotkeys
            IntPtr h = Handle;
            if (h == IntPtr.Zero) return;

            NativeMethods.RegisterHotKey(h, HOTKEY_TOGGLE_VISIBLE,
                NativeMethods.MOD_ALT | NativeMethods.MOD_SHIFT | NativeMethods.MOD_NOREPEAT,
                (uint)Keys.A);

            NativeMethods.RegisterHotKey(h, HOTKEY_TOGGLE_TOPMOST,
                NativeMethods.MOD_ALT | NativeMethods.MOD_SHIFT | NativeMethods.MOD_NOREPEAT,
                (uint)Keys.T);

            NativeMethods.RegisterHotKey(h, HOTKEY_TOGGLE_BOSSKEY,
                NativeMethods.MOD_ALT | NativeMethods.MOD_NOREPEAT,
                NativeMethods.VK_OEM_3);
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
                        catch
                        {
                            Thread.Sleep(500);
                        }
                    }
                });
                wakeListenerThread.IsBackground = true;
                wakeListenerThread.Start();
            }
            catch
            {
                // Ignore if event creation fails
            }
        }

        private int PickOrReuseServerPort()
        {
            HashSet<int> activePorts = GetActiveListeningPorts();

            for (int port = 3210; port <= 3220; port++)
            {
                if (activePorts.Contains(port) && CheckHealthEndpoint(port))
                {
                    return port;
                }
            }

            for (int port = 3210; port <= 3220; port++)
            {
                if (!activePorts.Contains(port) && IsPortAvailable(port))
                {
                    return port;
                }
            }
            return 3210;
        }

        private HashSet<int> GetActiveListeningPorts()
        {
            HashSet<int> set = new HashSet<int>();
            try
            {
                IPGlobalProperties props = IPGlobalProperties.GetIPGlobalProperties();
                IPEndPoint[] listeners = props.GetActiveTcpListeners();
                for (int i = 0; i < listeners.Length; i++)
                {
                    set.Add(listeners[i].Port);
                }
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
            catch
            {
                return false;
            }
        }

        private bool CheckHealthEndpoint(int port)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/desktop/health");
                req.Method = "GET";
                req.Proxy = null;
                req.Timeout = 450;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                using (StreamReader sr = new StreamReader(resp.GetResponseStream()))
                {
                    string body = sr.ReadToEnd();
                    return body.IndexOf("passion-2fa-desktop", StringComparison.OrdinalIgnoreCase) >= 0;
                }
            }
            catch
            {
                return false;
            }
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
                MessageBox.Show(
                    "Không thể khởi động máy chủ nội bộ (Node.js) trên cổng " + serverPort + ".\nVui lòng kiểm tra Node.js đã được cài đặt chưa.",
                    "Passion 2FA Desktop",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            SyncInitialServerSeq();

            string browserExe = FindBrowserExecutable();
            if (string.IsNullOrEmpty(browserExe))
            {
                MessageBox.Show(
                    "Không tìm thấy Microsoft Edge hoặc Google Chrome trên máy tính.",
                    "Passion 2FA Desktop",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            string profileDir = Path.Combine(appDir, ".tmp_2fa_desktop_profile");
            if (!Directory.Exists(profileDir))
            {
                try { Directory.CreateDirectory(profileDir); } catch { }
            }

            string appUrl = baseUrl + "/2fa.html?desktop=1";
            string args = string.Format(
                "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1440,900 --no-first-run --no-default-browser-check --disable-features=msEdgeSidebarV2",
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
                MessageBox.Show("Không thể mở cửa sổ ứng dụng: " + ex.Message, "Passion 2FA Desktop", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            StartCommandPolling();

            monitorTimer = new System.Windows.Forms.Timer();
            monitorTimer.Interval = 350;
            monitorTimer.Tick += MonitorWindowTick;
            monitorTimer.Start();
        }

        private bool EnsureNodeServerRunning()
        {
            if (CheckHealthEndpoint(serverPort))
            {
                return true;
            }

            string nodeExe = FindNodeExecutable();
            string serverScript = Path.Combine(appDir, "server\\server.mjs");
            if (!File.Exists(serverScript))
            {
                return false;
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExe;
            psi.Arguments = "\"" + serverScript + "\"";
            psi.WorkingDirectory = appDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.EnvironmentVariables["PORT"] = serverPort.ToString();

            try
            {
                nodeProcess = Process.Start(psi);
            }
            catch
            {
                return false;
            }

            DateTime deadline = DateTime.UtcNow.AddSeconds(10);
            while (DateTime.UtcNow < deadline)
            {
                if (CheckHealthEndpoint(serverPort))
                {
                    return true;
                }
                if (nodeProcess != null && nodeProcess.HasExited)
                {
                    return false;
                }
                Thread.Sleep(150);
            }
            return false;
        }

        private void SyncInitialServerSeq()
        {
            try
            {
                string stateJson = HttpGet(baseUrl + "/api/desktop/state", 1500);
                if (!string.IsNullOrEmpty(stateJson))
                {
                    Dictionary<string, object> data = json.Deserialize<Dictionary<string, object>>(stateJson);
                    if (data != null && data.ContainsKey("nativeSeq"))
                    {
                        nativeCommandSeq = Convert.ToInt64(data["nativeSeq"]);
                    }
                }
            }
            catch
            {
                nativeCommandSeq = 0;
            }
        }

        private void MonitorWindowTick(object sender, EventArgs e)
        {
            if (isShuttingDown) return;

            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd))
            {
                if (appHwnd != IntPtr.Zero && !isHiddenToTray)
                {
                    // App window was closed by user
                    ShutdownAll(true);
                    return;
                }

                // Still searching for newly spawned app window
                IntPtr found = FindPassionWindowHandle();
                if (found != IntPtr.Zero)
                {
                    appHwnd = found;
                    ApplyWindowIcons(appHwnd);
                    if (alwaysOnTop)
                    {
                        ApplyTopMostWin32(true);
                    }
                }
                else if ((DateTime.UtcNow - launchTimeUtc).TotalSeconds > 20 && browserProcess != null && browserProcess.HasExited)
                {
                    // Browser exited without ever producing our window
                    ShutdownAll(true);
                }
                return;
            }

            // If user clicked X while visible, IsWindow(appHwnd) becomes false above and shuts down cleanly.
        }

        private IntPtr FindPassionWindowHandle()
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
                if (string.IsNullOrEmpty(titleStr)) return true;
                if (titleStr.IndexOf("DevTools", StringComparison.OrdinalIgnoreCase) >= 0) return true;

                uint pid;
                NativeMethods.GetWindowThreadProcessId(hWnd, out pid);

                if (targetPid > 0 && (int)pid == targetPid)
                {
                    pidMatched = hWnd;
                    return false;
                }

                if (titleStr.IndexOf("Passion 2FA Hub", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    titleStr.IndexOf("127.0.0.1:" + serverPort, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    titleMatched = hWnd;
                }

                return true;
            }, IntPtr.Zero);

            return pidMatched != IntPtr.Zero ? pidMatched : titleMatched;
        }

        private void ApplyWindowIcons(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return;
            try
            {
                if (loadedTrayIcon != null)
                {
                    NativeMethods.SendMessage(hWnd, NativeMethods.WM_SETICON, new IntPtr(NativeMethods.ICON_SMALL), loadedTrayIcon.Handle);
                }
                if (loadedBigIcon != null)
                {
                    NativeMethods.SendMessage(hWnd, NativeMethods.WM_SETICON, new IntPtr(NativeMethods.ICON_BIG), loadedBigIcon.Handle);
                }
            }
            catch
            {
                // Non-critical
            }
        }

        private void ApplyTopMostWin32(bool enable)
        {
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd)) return;
            IntPtr insertAfter = enable ? NativeMethods.HWND_TOPMOST : NativeMethods.HWND_NOTOPMOST;
            NativeMethods.SetWindowPos(
                appHwnd,
                insertAfter,
                0, 0, 0, 0,
                NativeMethods.SWP_NOMOVE | NativeMethods.SWP_NOSIZE | NativeMethods.SWP_NOACTIVATE
            );
        }

        private void BringToForeground(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero || !NativeMethods.IsWindow(hWnd)) return;
            IntPtr fg = NativeMethods.GetForegroundWindow();
            uint fgPid;
            uint fgTid = (fg != IntPtr.Zero) ? NativeMethods.GetWindowThreadProcessId(fg, out fgPid) : 0;
            uint curTid = NativeMethods.GetCurrentThreadId();

            if (fgTid != 0 && fgTid != curTid)
            {
                NativeMethods.AttachThreadInput(curTid, fgTid, true);
                NativeMethods.SetForegroundWindow(hWnd);
                NativeMethods.AttachThreadInput(curTid, fgTid, false);
            }
            else
            {
                NativeMethods.SetForegroundWindow(hWnd);
            }
        }

        private void HideToTray()
        {
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd)) return;
            isHiddenToTray = true;
            NativeMethods.ShowWindow(appHwnd, NativeMethods.SW_HIDE);
            UpdateMenuChecks();
            PostNativeEvent("visibilityChanged", false, null);

            if (!hasShownTrayBalloon && trayIcon != null)
            {
                hasShownTrayBalloon = true;
                trayIcon.ShowBalloonTip(2500, "Passion 2FA đang chạy ngầm", "Nhấn Alt + Shift + A hoặc bấm biểu tượng góc phải để mở lại.", ToolTipIcon.Info);
            }
        }

        private void ShowAppWindow()
        {
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd))
            {
                appHwnd = FindPassionWindowHandle();
                if (appHwnd == IntPtr.Zero) return;
            }
            isHiddenToTray = false;
            if (NativeMethods.IsIconic(appHwnd))
            {
                NativeMethods.ShowWindow(appHwnd, NativeMethods.SW_RESTORE);
            }
            else
            {
                NativeMethods.ShowWindow(appHwnd, NativeMethods.SW_SHOW);
            }
            ApplyTopMostWin32(alwaysOnTop);
            BringToForeground(appHwnd);
            UpdateMenuChecks();
            PostNativeEvent("visibilityChanged", true, null);
        }

        private void ToggleShowHide()
        {
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd))
            {
                appHwnd = FindPassionWindowHandle();
                if (appHwnd == IntPtr.Zero) return;
            }

            if (isHiddenToTray || !NativeMethods.IsWindowVisible(appHwnd))
            {
                ShowAppWindow();
            }
            else
            {
                HideToTray();
            }
        }

        private void ToggleTopMostFromNative()
        {
            alwaysOnTop = !alwaysOnTop;
            ApplyTopMostWin32(alwaysOnTop);
            UpdateMenuChecks();
            PostNativeEvent("topMostChanged", alwaysOnTop, null);
        }

        private void ToggleBossKeyFromNative()
        {
            bossMode = !bossMode;
            UpdateMenuChecks();
            PostNativeEvent("toggleBossKey", bossMode, null);
        }

        private void SendLockPinCommand()
        {
            bossMode = false;
            UpdateMenuChecks();
            if (isHiddenToTray)
            {
                ShowAppWindow();
            }
            PostNativeEvent("lockApp", true, null);
        }

        private void UpdateMenuChecks()
        {
            if (menuTopMost != null) menuTopMost.Checked = alwaysOnTop;
            if (menuBossKey != null) menuBossKey.Checked = bossMode;
            if (menuShowHide != null)
            {
                menuShowHide.Text = isHiddenToTray
                    ? "Mở lại Passion 2FA (Alt+Shift+A)"
                    : "Ẩn xuống khay hệ thống (Alt+Shift+A)";
            }
        }

        private void StartCommandPolling()
        {
            commandPollThread = new Thread(delegate()
            {
                while (!isShuttingDown)
                {
                    try
                    {
                        string respJson = HttpGet(baseUrl + "/api/desktop/poll-native?since=" + nativeCommandSeq, 30000);
                        if (string.IsNullOrEmpty(respJson))
                        {
                            Thread.Sleep(500);
                            continue;
                        }

                        Dictionary<string, object> payload = json.Deserialize<Dictionary<string, object>>(respJson);
                        if (payload == null) continue;

                        if (payload.ContainsKey("seq"))
                        {
                            long seq = Convert.ToInt64(payload["seq"]);
                            if (seq > nativeCommandSeq) nativeCommandSeq = seq;
                        }

                        if (payload.ContainsKey("events") && payload["events"] is object[])
                        {
                            object[] events = (object[])payload["events"];
                            for (int i = 0; i < events.Length; i++)
                            {
                                Dictionary<string, object> evt = events[i] as Dictionary<string, object>;
                                if (evt == null) continue;
                                if (evt.ContainsKey("id"))
                                {
                                    long id = Convert.ToInt64(evt["id"]);
                                    if (id > nativeCommandSeq) nativeCommandSeq = id;
                                }
                                HandleCommandFromWeb(evt);
                            }
                        }
                    }
                    catch
                    {
                        Thread.Sleep(800);
                    }
                }
            });
            commandPollThread.IsBackground = true;
            commandPollThread.Start();
        }

        private void HandleCommandFromWeb(Dictionary<string, object> evt)
        {
            string type = evt.ContainsKey("type") ? Convert.ToString(evt["type"]) : "";
            if (type == "setTopMost")
            {
                bool val = evt.ContainsKey("value") && Convert.ToBoolean(evt["value"]);
                SafeBeginInvoke(delegate
                {
                    alwaysOnTop = val;
                    ApplyTopMostWin32(alwaysOnTop);
                    UpdateMenuChecks();
                });
            }
            else if (type == "hideToTray")
            {
                SafeBeginInvoke(delegate { HideToTray(); });
            }
            else if (type == "showWindow")
            {
                SafeBeginInvoke(delegate { ShowAppWindow(); });
            }
            else if (type == "bossModeSynced")
            {
                bool val = evt.ContainsKey("value") && Convert.ToBoolean(evt["value"]);
                SafeBeginInvoke(delegate
                {
                    bossMode = val;
                    UpdateMenuChecks();
                });
            }
            else if (type == "createShortcut")
            {
                SafeBeginInvoke(delegate { CreateDesktopShortcut(true); });
            }
        }

        private void CreateDesktopShortcut(bool notifyUser)
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutPath = Path.Combine(desktopPath, "Passion 2FA Hub.lnk");
                string exePath = Application.ExecutablePath;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                object shell = Activator.CreateInstance(shellType);
                object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
                Type shortcutType = shortcut.GetType();

                shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { exePath });
                shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { appDir });
                shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "Passion 2FA Security Hub - Desktop App" });
                if (File.Exists(iconPath))
                {
                    shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconPath + ",0" });
                }
                shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);

                if (notifyUser)
                {
                    PostNativeToast("🖥️ Đã tạo lối tắt Passion 2FA Hub ngoài Desktop!", "success");
                    if (isHiddenToTray && trayIcon != null)
                    {
                        trayIcon.ShowBalloonTip(2500, "Passion 2FA Hub", "Đã tạo lối tắt (Shortcut) ngoài Desktop!", ToolTipIcon.Info);
                    }
                }
            }
            catch (Exception ex)
            {
                if (notifyUser)
                {
                    MessageBox.Show("Không thể tạo Shortcut: " + ex.Message, "Passion 2FA Desktop", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }
        }

        private void PostNativeEvent(string type, object value, string message)
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["type"] = type;
                    if (value != null) body["value"] = value;
                    if (message != null) body["message"] = message;
                    HttpPostJson(baseUrl + "/api/desktop/native-event", json.Serialize(body));
                }
                catch { }
            });
        }

        private void PostNativeToast(string message, string level)
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["type"] = "toast";
                    body["message"] = message;
                    body["level"] = level;
                    HttpPostJson(baseUrl + "/api/desktop/native-event", json.Serialize(body));
                }
                catch { }
            });
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
            try
            {
                if (IsHandleCreated && !IsDisposed)
                {
                    BeginInvoke(action);
                }
            }
            catch { }
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == NativeMethods.WM_HOTKEY)
            {
                int id = m.WParam.ToInt32();
                if (id == HOTKEY_TOGGLE_VISIBLE)
                {
                    ToggleShowHide();
                }
                else if (id == HOTKEY_TOGGLE_TOPMOST)
                {
                    ToggleTopMostFromNative();
                }
                else if (id == HOTKEY_TOGGLE_BOSSKEY)
                {
                    ToggleBossKeyFromNative();
                }
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

            try
            {
                if (monitorTimer != null)
                {
                    monitorTimer.Stop();
                    monitorTimer.Dispose();
                }
            }
            catch { }

            try
            {
                if (IsHandleCreated)
                {
                    NativeMethods.UnregisterHotKey(Handle, HOTKEY_TOGGLE_VISIBLE);
                    NativeMethods.UnregisterHotKey(Handle, HOTKEY_TOGGLE_TOPMOST);
                    NativeMethods.UnregisterHotKey(Handle, HOTKEY_TOGGLE_BOSSKEY);
                }
            }
            catch { }

            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
            }
            catch { }

            if (closeBrowserWindow && appHwnd != IntPtr.Zero && NativeMethods.IsWindow(appHwnd))
            {
                try
                {
                    NativeMethods.PostMessage(appHwnd, NativeMethods.WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
                }
                catch { }
            }

            if (nodeProcess != null)
            {
                try
                {
                    if (!nodeProcess.HasExited)
                    {
                        nodeProcess.Kill();
                    }
                    nodeProcess.Dispose();
                }
                catch { }
            }

            try
            {
                if (wakeEvent != null) wakeEvent.Close();
            }
            catch { }

            try
            {
                Application.Exit();
            }
            catch { }
        }
    }

    internal static class Program
    {
        private const string MUTEX_NAME = "Local\\PassionStar_2FA_Desktop_App_Mutex";
        private const string WAKE_EVENT_NAME = "Local\\PassionStar_2FA_Desktop_Wakeup_Event";

        [STAThread]
        private static void Main()
        {
            bool createdNew;
            using (Mutex mutex = new Mutex(true, MUTEX_NAME, out createdNew))
            {
                if (!createdNew)
                {
                    // Signal existing instance to restore window from System Tray
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
                Application.Run(new DesktopControllerForm());
            }
        }
    }
}
