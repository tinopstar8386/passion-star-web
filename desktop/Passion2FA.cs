using System;
using System.Collections;
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
using System.Text.RegularExpressions;
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
        private Embedded2FAHttpServer fallbackServer;
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

        private sealed class NodeRuntimeCandidate
        {
            public string ExePath;
            public bool UseElectronAsNode;
        }

        private void AddRuntimeCandidate(List<NodeRuntimeCandidate> list, HashSet<string> seen, string exePath, bool useElectronAsNode)
        {
            if (string.IsNullOrEmpty(exePath)) return;
            try
            {
                string expanded = Environment.ExpandEnvironmentVariables(exePath.Trim().Trim('"'));
                string full = Path.GetFullPath(expanded);
                if (!File.Exists(full)) return;
                string key = full.ToLowerInvariant() + "|" + (useElectronAsNode ? "1" : "0");
                if (seen.Add(key))
                {
                    list.Add(new NodeRuntimeCandidate { ExePath = full, UseElectronAsNode = useElectronAsNode });
                }
            }
            catch { }
        }

        private string TryExtractExeFromCmd(string cmdPath)
        {
            try
            {
                if (!File.Exists(cmdPath)) return null;
                string text = File.ReadAllText(cmdPath, Encoding.UTF8);
                Match quoted = Regex.Match(text, "\"([^\"]+?\\.exe)\"", RegexOptions.IgnoreCase);
                if (quoted.Success)
                {
                    string p = Environment.ExpandEnvironmentVariables(quoted.Groups[1].Value);
                    if (File.Exists(p)) return p;
                }
                Match unquoted = Regex.Match(text, @"([A-Za-z]:\\[^\s""']+?\.exe)", RegexOptions.IgnoreCase);
                if (unquoted.Success && File.Exists(unquoted.Groups[1].Value)) return unquoted.Groups[1].Value;
            }
            catch { }
            return null;
        }

        private List<NodeRuntimeCandidate> FindNodeRuntimes()
        {
            List<NodeRuntimeCandidate> list = new List<NodeRuntimeCandidate>();
            HashSet<string> seen = new HashSet<string>();

            string pf64 = Environment.GetEnvironmentVariable("ProgramW6432") ?? "";
            string pf = Environment.GetEnvironmentVariable("ProgramFiles") ?? Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)") ?? Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string commonPf64 = Environment.GetEnvironmentVariable("CommonProgramW6432") ?? "";
            string commonPf = Environment.GetEnvironmentVariable("CommonProgramFiles") ?? "";
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            // 1. Standard Node.js installations
            AddRuntimeCandidate(list, seen, Path.Combine(pf64, "nodejs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, Path.Combine(pf, "nodejs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, Path.Combine(pfx86, "nodejs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, "C:\\Program Files\\nodejs\\node.exe", false);
            AddRuntimeCandidate(list, seen, Path.Combine(localAppData, "Programs\\nodejs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, Path.Combine(userProfile, ".volta\\bin\\node.exe"), false);
            AddRuntimeCandidate(list, seen, Path.Combine(userProfile, "scoop\\apps\\nodejs-lts\\current\\node.exe"), false);
            AddRuntimeCandidate(list, seen, Path.Combine(userProfile, "scoop\\apps\\nodejs\\current\\node.exe"), false);

            string[] nvmRoots = new string[]
            {
                Path.Combine(appData, "nvm"),
                Path.Combine(localAppData, "nvm")
            };
            for (int r = 0; r < nvmRoots.Length; r++)
            {
                try
                {
                    if (!Directory.Exists(nvmRoots[r])) continue;
                    string[] subDirs = Directory.GetDirectories(nvmRoots[r], "v*");
                    for (int s = 0; s < subDirs.Length; s++)
                    {
                        AddRuntimeCandidate(list, seen, Path.Combine(subDirs[s], "node.exe"), false);
                    }
                }
                catch { }
            }

            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] dirs = pathEnv.Split(';');
            for (int i = 0; i < dirs.Length; i++)
            {
                string d = dirs[i].Trim();
                if (string.IsNullOrEmpty(d)) continue;
                AddRuntimeCandidate(list, seen, Path.Combine(d, "node.exe"), false);
            }

            // 2. Electron-as-Node binaries (Antigravity / VS Code / Cursor)
            string agyCmd = Path.Combine(appData, "Antigravity\\bin\\agy-node.cmd");
            AddRuntimeCandidate(list, seen, TryExtractExeFromCmd(agyCmd), true);
            AddRuntimeCandidate(list, seen, Path.Combine(localAppData, "Programs\\antigravity\\Antigravity.exe"), true);
            AddRuntimeCandidate(list, seen, Path.Combine(pf, "Antigravity\\Antigravity.exe"), true);
            AddRuntimeCandidate(list, seen, Path.Combine(localAppData, "Programs\\Microsoft VS Code\\Code.exe"), true);
            AddRuntimeCandidate(list, seen, Path.Combine(pf, "Microsoft VS Code\\Code.exe"), true);
            AddRuntimeCandidate(list, seen, Path.Combine(localAppData, "Programs\\cursor\\Cursor.exe"), true);

            // 3. Bundled third-party Node.js runtimes (e.g. Adobe Creative Cloud)
            AddRuntimeCandidate(list, seen, Path.Combine(pf64, "Adobe\\Adobe Creative Cloud Experience\\libs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, Path.Combine(pf, "Adobe\\Adobe Creative Cloud Experience\\libs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, "C:\\Program Files\\Adobe\\Adobe Creative Cloud Experience\\libs\\node.exe", false);
            AddRuntimeCandidate(list, seen, Path.Combine(commonPf64, "Adobe\\Creative Cloud Libraries\\libs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, Path.Combine(commonPf, "Adobe\\Creative Cloud Libraries\\libs\\node.exe"), false);
            AddRuntimeCandidate(list, seen, "C:\\Program Files\\Common Files\\Adobe\\Creative Cloud Libraries\\libs\\node.exe", false);

            return list;
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

            string serverScript = Path.Combine(appDir, "server\\server.mjs");
            if (File.Exists(serverScript))
            {
                List<NodeRuntimeCandidate> runtimes = FindNodeRuntimes();
                for (int i = 0; i < runtimes.Count; i++)
                {
                    NodeRuntimeCandidate cand = runtimes[i];
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = cand.ExePath;
                    psi.Arguments = "\"" + serverScript + "\"";
                    psi.WorkingDirectory = appDir;
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.EnvironmentVariables["PORT"] = serverPort.ToString();
                    if (cand.UseElectronAsNode)
                    {
                        psi.EnvironmentVariables["ELECTRON_RUN_AS_NODE"] = "1";
                    }

                    Process proc = null;
                    try
                    {
                        proc = Process.Start(psi);
                    }
                    catch
                    {
                        proc = null;
                    }
                    if (proc == null) continue;

                    DateTime deadline = DateTime.UtcNow.AddSeconds(6);
                    while (DateTime.UtcNow < deadline)
                    {
                        if (CheckHealthEndpoint(serverPort))
                        {
                            nodeProcess = proc;
                            return true;
                        }
                        if (proc.HasExited)
                        {
                            break;
                        }
                        Thread.Sleep(150);
                    }

                    try
                    {
                        if (!proc.HasExited) proc.Kill();
                        proc.Dispose();
                    }
                    catch { }
                }
            }

            return StartEmbeddedFallbackServer();
        }

        private bool StartEmbeddedFallbackServer()
        {
            try
            {
                if (fallbackServer != null)
                {
                    fallbackServer.Stop();
                    fallbackServer = null;
                }
                fallbackServer = new Embedded2FAHttpServer(appDir, serverPort);
                fallbackServer.Start();

                DateTime deadline = DateTime.UtcNow.AddSeconds(3);
                while (DateTime.UtcNow < deadline)
                {
                    if (CheckHealthEndpoint(serverPort)) return true;
                    Thread.Sleep(50);
                }
            }
            catch { }
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

            if (fallbackServer != null)
            {
                try { fallbackServer.Stop(); } catch { }
                fallbackServer = null;
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

    internal sealed class Embedded2FAHttpServer
    {
        private const string GAS_TARGET_URL = "https://script.google.com/macros/s/AKfycbyTs0IMHFSOi9NH-UPPCq85oieHpM7w_dKE1WdJxj01vDB4ycdwPvo9udh8Df-Ashg_Fg/exec";
        private static readonly object tlsLock = new object();
        private static bool tlsConfigured = false;

        private static readonly Dictionary<string, string> MIME_TYPES = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=UTF-8" },
            { ".css", "text/css; charset=UTF-8" },
            { ".js", "application/javascript; charset=UTF-8" },
            { ".mjs", "application/javascript; charset=UTF-8" },
            { ".json", "application/json; charset=UTF-8" },
            { ".png", "image/png" },
            { ".jpg", "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".svg", "image/svg+xml" },
            { ".ico", "image/x-icon" },
            { ".webp", "image/webp" },
            { ".woff2", "font/woff2" }
        };

        private readonly string rootDir;
        private readonly int port;
        private readonly object bridgeLock = new object();
        private TcpListener listener;
        private Thread acceptThread;
        private volatile bool running = false;

        private bool alwaysOnTop = false;
        private bool visible = true;
        private bool bossMode = false;
        private int urgentAlarmCount = 0;
        private string lastUrgentAlarm = "";
        private long updatedAt = NowMs();

        private long nativeSeq = 0;
        private long webSeq = 0;
        private readonly List<Dictionary<string, object>> nativeQueue = new List<Dictionary<string, object>>();
        private readonly List<Dictionary<string, object>> webQueue = new List<Dictionary<string, object>>();

        public Embedded2FAHttpServer(string appRootDir, int listenPort)
        {
            rootDir = appRootDir;
            port = listenPort;
            EnsureTlsConfigured();
        }

        private static long NowMs()
        {
            return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
        }

        private static JavaScriptSerializer CreateSerializer()
        {
            JavaScriptSerializer js = new JavaScriptSerializer();
            js.MaxJsonLength = 16 * 1024 * 1024;
            return js;
        }

        private static void EnsureTlsConfigured()
        {
            if (tlsConfigured) return;
            lock (tlsLock)
            {
                if (tlsConfigured) return;
                try { ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072 | (SecurityProtocolType)768; } catch { }
                try { ServicePointManager.Expect100Continue = false; } catch { }
                tlsConfigured = true;
            }
        }

        public void Start()
        {
            if (running) return;
            running = true;
            listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            acceptThread = new Thread(AcceptLoop);
            acceptThread.IsBackground = true;
            acceptThread.Start();
        }

        public void Stop()
        {
            running = false;
            lock (bridgeLock)
            {
                Monitor.PulseAll(bridgeLock);
            }
            try { if (listener != null) listener.Stop(); } catch { }
        }

        private void AcceptLoop()
        {
            while (running)
            {
                try
                {
                    TcpClient client = listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(HandleClient, client);
                }
                catch
                {
                    if (!running) break;
                    Thread.Sleep(50);
                }
            }
        }

        private sealed class ParsedHttpRequest
        {
            public string Method;
            public string Path;
            public string Query;
            public string Body;
        }

        private static int FindHeaderEnd(List<byte> buf)
        {
            for (int i = 0; i <= buf.Count - 4; i++)
            {
                if (buf[i] == 13 && buf[i + 1] == 10 && buf[i + 2] == 13 && buf[i + 3] == 10) return i;
            }
            return -1;
        }

        private static ParsedHttpRequest ReadHttpRequest(NetworkStream stream)
        {
            List<byte> buf = new List<byte>(4096);
            byte[] tmp = new byte[4096];
            int headerEnd = -1;

            while (headerEnd < 0)
            {
                int n = stream.Read(tmp, 0, tmp.Length);
                if (n <= 0) return null;
                for (int i = 0; i < n; i++) buf.Add(tmp[i]);
                headerEnd = FindHeaderEnd(buf);
                if (buf.Count > 1048576) return null;
            }

            string headerText = Encoding.ASCII.GetString(buf.ToArray(), 0, headerEnd);
            string[] lines = headerText.Split(new string[] { "\r\n" }, StringSplitOptions.None);
            if (lines.Length == 0) return null;

            string[] parts = lines[0].Split(' ');
            if (parts.Length < 2) return null;

            int contentLength = 0;
            bool expectContinue = false;
            for (int i = 1; i < lines.Length; i++)
            {
                int colon = lines[i].IndexOf(':');
                if (colon <= 0) continue;
                string name = lines[i].Substring(0, colon).Trim();
                string val = lines[i].Substring(colon + 1).Trim();
                if (name.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                {
                    int cl;
                    if (int.TryParse(val, out cl) && cl > 0) contentLength = Math.Min(cl, 16 * 1024 * 1024);
                }
                else if (name.Equals("Expect", StringComparison.OrdinalIgnoreCase) && val.IndexOf("100-continue", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    expectContinue = true;
                }
            }

            if (expectContinue)
            {
                byte[] cont = Encoding.ASCII.GetBytes("HTTP/1.1 100 Continue\r\n\r\n");
                stream.Write(cont, 0, cont.Length);
            }

            int bodyStart = headerEnd + 4;
            int alreadyHave = buf.Count - bodyStart;
            byte[] bodyBytes = new byte[contentLength];
            if (contentLength > 0)
            {
                int copyLen = Math.Min(alreadyHave, contentLength);
                if (copyLen > 0) buf.CopyTo(bodyStart, bodyBytes, 0, copyLen);
                int offset = copyLen;
                while (offset < contentLength)
                {
                    int n = stream.Read(bodyBytes, offset, contentLength - offset);
                    if (n <= 0) break;
                    offset += n;
                }
            }

            string rawTarget = parts[1];
            string pathPart = rawTarget;
            string queryPart = "";
            int qIdx = rawTarget.IndexOf('?');
            if (qIdx >= 0)
            {
                pathPart = rawTarget.Substring(0, qIdx);
                queryPart = rawTarget.Substring(qIdx + 1);
            }

            return new ParsedHttpRequest
            {
                Method = parts[0].ToUpperInvariant(),
                Path = pathPart,
                Query = queryPart,
                Body = contentLength > 0 ? Encoding.UTF8.GetString(bodyBytes) : ""
            };
        }

        private static string GetQueryParam(string query, string key)
        {
            if (string.IsNullOrEmpty(query)) return null;
            string[] pairs = query.Split('&');
            for (int i = 0; i < pairs.Length; i++)
            {
                int eq = pairs[i].IndexOf('=');
                string k = eq >= 0 ? pairs[i].Substring(0, eq) : pairs[i];
                string v = eq >= 0 ? pairs[i].Substring(eq + 1) : "";
                if (Uri.UnescapeDataString(k.Replace('+', ' ')) == key)
                {
                    return Uri.UnescapeDataString(v.Replace('+', ' '));
                }
            }
            return null;
        }

        private void HandleClient(object state)
        {
            TcpClient client = (TcpClient)state;
            try
            {
                client.ReceiveTimeout = 35000;
                client.SendTimeout = 10000;
                using (client)
                using (NetworkStream stream = client.GetStream())
                {
                    ParsedHttpRequest req = ReadHttpRequest(stream);
                    if (req == null) return;

                    if (req.Method == "OPTIONS")
                    {
                        WriteHttpResponse(stream, 204, "No Content", "text/plain; charset=UTF-8", new byte[0], false);
                        return;
                    }

                    if (req.Path == "/api/proxy" && req.Method == "POST")
                    {
                        SendJsonResponse(stream, 200, "OK", HandleGasProxy(req.Body));
                        return;
                    }

                    if (req.Path == "/api/desktop/health" && req.Method == "GET")
                    {
                        Dictionary<string, object> health = new Dictionary<string, object>();
                        health["status"] = "ok";
                        health["app"] = "passion-2fa-desktop";
                        health["port"] = port;
                        SendJsonResponse(stream, 200, "OK", health);
                        return;
                    }

                    if (req.Path == "/api/desktop/state" && req.Method == "GET")
                    {
                        SendJsonResponse(stream, 200, "OK", BuildStateSnapshot());
                        return;
                    }

                    if (req.Path == "/api/desktop/poll-native" && req.Method == "GET")
                    {
                        long since;
                        long.TryParse(GetQueryParam(req.Query, "since") ?? "0", out since);
                        SendJsonResponse(stream, 200, "OK", HandleLongPoll(true, since));
                        return;
                    }

                    if (req.Path == "/api/desktop/poll-web" && req.Method == "GET")
                    {
                        long since;
                        long.TryParse(GetQueryParam(req.Query, "since") ?? "0", out since);
                        SendJsonResponse(stream, 200, "OK", HandleLongPoll(false, since));
                        return;
                    }

                    if (req.Path == "/api/desktop/command" && req.Method == "POST")
                    {
                        int statusCode = 200;
                        Dictionary<string, object> resp = HandleDesktopCommand(req.Body, out statusCode);
                        SendJsonResponse(stream, statusCode, statusCode == 200 ? "OK" : "Bad Request", resp);
                        return;
                    }

                    if (req.Path == "/api/desktop/native-event" && req.Method == "POST")
                    {
                        int statusCode = 200;
                        Dictionary<string, object> resp = HandleNativeEvent(req.Body, out statusCode);
                        SendJsonResponse(stream, statusCode, statusCode == 200 ? "OK" : "Bad Request", resp);
                        return;
                    }

                    TryServeStaticFile(stream, req.Path);
                }
            }
            catch { }
        }

        private Dictionary<string, object> BuildDesktopStateDictLocked()
        {
            Dictionary<string, object> d = new Dictionary<string, object>();
            d["alwaysOnTop"] = alwaysOnTop;
            d["visible"] = visible;
            d["bossMode"] = bossMode;
            d["isDesktop"] = true;
            d["updatedAt"] = updatedAt;
            if (urgentAlarmCount > 0 || !string.IsNullOrEmpty(lastUrgentAlarm))
            {
                d["urgentAlarmCount"] = urgentAlarmCount;
                d["lastUrgentAlarm"] = lastUrgentAlarm;
            }
            return d;
        }

        private Dictionary<string, object> BuildStateSnapshot()
        {
            lock (bridgeLock)
            {
                Dictionary<string, object> d = BuildDesktopStateDictLocked();
                d["nativeSeq"] = nativeSeq;
                d["webSeq"] = webSeq;
                return d;
            }
        }

        private void PushEventLocked(List<Dictionary<string, object>> queue, ref long seqCounter, Dictionary<string, object> evt)
        {
            seqCounter += 1;
            evt["id"] = seqCounter;
            evt["ts"] = NowMs();
            queue.Add(evt);
            if (queue.Count > 100) queue.RemoveAt(0);
            Monitor.PulseAll(bridgeLock);
        }

        private Dictionary<string, object> HandleLongPoll(bool isNative, long since)
        {
            DateTime deadline = DateTime.UtcNow.AddMilliseconds(25000);
            lock (bridgeLock)
            {
                List<Dictionary<string, object>> queue = isNative ? nativeQueue : webQueue;
                while (running)
                {
                    List<object> pending = new List<object>();
                    for (int i = 0; i < queue.Count; i++)
                    {
                        if (Convert.ToInt64(queue[i]["id"]) > since)
                        {
                            pending.Add(new Dictionary<string, object>(queue[i]));
                        }
                    }
                    if (pending.Count > 0)
                    {
                        Dictionary<string, object> ok = new Dictionary<string, object>();
                        ok["events"] = pending.ToArray();
                        ok["seq"] = isNative ? nativeSeq : webSeq;
                        ok["state"] = BuildDesktopStateDictLocked();
                        return ok;
                    }
                    int remainingMs = (int)(deadline - DateTime.UtcNow).TotalMilliseconds;
                    if (remainingMs <= 0) break;
                    Monitor.Wait(bridgeLock, remainingMs);
                }

                Dictionary<string, object> empty = new Dictionary<string, object>();
                empty["events"] = new object[0];
                empty["seq"] = isNative ? nativeSeq : webSeq;
                empty["state"] = BuildDesktopStateDictLocked();
                return empty;
            }
        }

        private Dictionary<string, object> HandleDesktopCommand(string rawBody, out int statusCode)
        {
            try
            {
                JavaScriptSerializer js = CreateSerializer();
                Dictionary<string, object> body = string.IsNullOrEmpty(rawBody)
                    ? new Dictionary<string, object>()
                    : js.Deserialize<Dictionary<string, object>>(rawBody);
                if (body == null) body = new Dictionary<string, object>();

                string type = body.ContainsKey("type") && body["type"] != null ? Convert.ToString(body["type"]) : "";
                lock (bridgeLock)
                {
                    updatedAt = NowMs();
                    if (type == "toggleTopMost")
                    {
                        alwaysOnTop = !alwaysOnTop;
                        Dictionary<string, object> n = new Dictionary<string, object>(); n["type"] = "setTopMost"; n["value"] = alwaysOnTop;
                        Dictionary<string, object> w = new Dictionary<string, object>(); w["type"] = "topMostChanged"; w["value"] = alwaysOnTop;
                        PushEventLocked(nativeQueue, ref nativeSeq, n);
                        PushEventLocked(webQueue, ref webSeq, w);
                    }
                    else if (type == "setTopMost")
                    {
                        alwaysOnTop = body.ContainsKey("value") && body["value"] != null && Convert.ToBoolean(body["value"]);
                        Dictionary<string, object> n = new Dictionary<string, object>(); n["type"] = "setTopMost"; n["value"] = alwaysOnTop;
                        Dictionary<string, object> w = new Dictionary<string, object>(); w["type"] = "topMostChanged"; w["value"] = alwaysOnTop;
                        PushEventLocked(nativeQueue, ref nativeSeq, n);
                        PushEventLocked(webQueue, ref webSeq, w);
                    }
                    else if (type == "hideToTray")
                    {
                        visible = false;
                        Dictionary<string, object> n = new Dictionary<string, object>(); n["type"] = "hideToTray";
                        PushEventLocked(nativeQueue, ref nativeSeq, n);
                    }
                    else if (type == "showWindow")
                    {
                        visible = true;
                        Dictionary<string, object> n = new Dictionary<string, object>(); n["type"] = "showWindow";
                        PushEventLocked(nativeQueue, ref nativeSeq, n);
                    }
                    else if (type == "createShortcut")
                    {
                        Dictionary<string, object> n = new Dictionary<string, object>(); n["type"] = "createShortcut";
                        PushEventLocked(nativeQueue, ref nativeSeq, n);
                    }
                    else if (type == "bossKeySynced")
                    {
                        bossMode = body.ContainsKey("value") && body["value"] != null && Convert.ToBoolean(body["value"]);
                        Dictionary<string, object> n = new Dictionary<string, object>(); n["type"] = "bossModeSynced"; n["value"] = bossMode;
                        PushEventLocked(nativeQueue, ref nativeSeq, n);
                    }
                    else if (type == "urgentAlarm")
                    {
                        urgentAlarmCount = body.ContainsKey("count") && body["count"] != null ? Convert.ToInt32(body["count"]) : 0;
                        lastUrgentAlarm = body.ContainsKey("summary") && body["summary"] != null ? Convert.ToString(body["summary"]) : "";
                        bool bringToFront = body.ContainsKey("bringToFront") && body["bringToFront"] is bool && (bool)body["bringToFront"];
                        if (bringToFront || !visible)
                        {
                            visible = true;
                            Dictionary<string, object> n = new Dictionary<string, object>(); n["type"] = "showWindow";
                            PushEventLocked(nativeQueue, ref nativeSeq, n);
                        }
                    }
                    else
                    {
                        statusCode = 400;
                        Dictionary<string, object> bad = new Dictionary<string, object>();
                        bad["status"] = "error";
                        bad["message"] = "Unknown command type";
                        return bad;
                    }

                    statusCode = 200;
                    Dictionary<string, object> ok = new Dictionary<string, object>();
                    ok["status"] = "ok";
                    ok["state"] = BuildDesktopStateDictLocked();
                    return ok;
                }
            }
            catch (Exception ex)
            {
                statusCode = 400;
                Dictionary<string, object> err = new Dictionary<string, object>();
                err["status"] = "error";
                err["message"] = ex.Message;
                return err;
            }
        }

        private Dictionary<string, object> HandleNativeEvent(string rawBody, out int statusCode)
        {
            try
            {
                JavaScriptSerializer js = CreateSerializer();
                Dictionary<string, object> body = string.IsNullOrEmpty(rawBody)
                    ? new Dictionary<string, object>()
                    : js.Deserialize<Dictionary<string, object>>(rawBody);
                if (body == null) body = new Dictionary<string, object>();

                string type = body.ContainsKey("type") && body["type"] != null ? Convert.ToString(body["type"]) : "";
                lock (bridgeLock)
                {
                    updatedAt = NowMs();
                    if (type == "topMostChanged")
                    {
                        alwaysOnTop = body.ContainsKey("value") && body["value"] != null && Convert.ToBoolean(body["value"]);
                        Dictionary<string, object> w = new Dictionary<string, object>(); w["type"] = "topMostChanged"; w["value"] = alwaysOnTop;
                        PushEventLocked(webQueue, ref webSeq, w);
                    }
                    else if (type == "visibilityChanged")
                    {
                        visible = body.ContainsKey("value") && body["value"] != null && Convert.ToBoolean(body["value"]);
                        Dictionary<string, object> w = new Dictionary<string, object>(); w["type"] = "visibilityChanged"; w["value"] = visible;
                        PushEventLocked(webQueue, ref webSeq, w);
                    }
                    else if (type == "toggleBossKey")
                    {
                        bossMode = (body.ContainsKey("value") && body["value"] is bool) ? (bool)body["value"] : !bossMode;
                        Dictionary<string, object> w = new Dictionary<string, object>(); w["type"] = "toggleBossKey"; w["value"] = bossMode;
                        PushEventLocked(webQueue, ref webSeq, w);
                    }
                    else if (type == "lockApp")
                    {
                        Dictionary<string, object> w = new Dictionary<string, object>(); w["type"] = "lockApp";
                        PushEventLocked(webQueue, ref webSeq, w);
                    }
                    else if (type == "toast")
                    {
                        Dictionary<string, object> w = new Dictionary<string, object>();
                        w["type"] = "toast";
                        w["message"] = body.ContainsKey("message") && body["message"] != null ? Convert.ToString(body["message"]) : "";
                        w["level"] = body.ContainsKey("level") && body["level"] != null ? Convert.ToString(body["level"]) : "info";
                        PushEventLocked(webQueue, ref webSeq, w);
                    }

                    statusCode = 200;
                    Dictionary<string, object> ok = new Dictionary<string, object>();
                    ok["status"] = "ok";
                    ok["state"] = BuildDesktopStateDictLocked();
                    return ok;
                }
            }
            catch (Exception ex)
            {
                statusCode = 400;
                Dictionary<string, object> err = new Dictionary<string, object>();
                err["status"] = "error";
                err["message"] = ex.Message;
                return err;
            }
        }

        private object ParseGasJson(string text, JavaScriptSerializer js)
        {
            try { return js.DeserializeObject(text); }
            catch
            {
                string clean = Regex.Replace(text ?? "", "<[^>]+>", " ").Trim();
                if (clean.Length > 120) clean = clean.Substring(0, 120);
                Dictionary<string, object> err = new Dictionary<string, object>();
                err["status"] = "error";
                err["message"] = "Lỗi từ Google: " + clean;
                return err;
            }
        }

        private object HandleGasProxy(string rawBody)
        {
            JavaScriptSerializer js = CreateSerializer();
            try
            {
                string requestBody = string.IsNullOrEmpty(rawBody) ? "{}" : rawBody;
                try
                {
                    object parsed = js.DeserializeObject(requestBody);
                    if (parsed is string) requestBody = (string)parsed;
                }
                catch { }

                string encodedReq = Uri.EscapeDataString(requestBody);
                if (encodedReq.Length <= 3500)
                {
                    try
                    {
                        HttpWebRequest getReq = (HttpWebRequest)WebRequest.Create(GAS_TARGET_URL + "?req=" + encodedReq);
                        getReq.Method = "GET";
                        getReq.Timeout = 20000;
                        using (HttpWebResponse resp = (HttpWebResponse)getReq.GetResponse())
                        using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                        {
                            object getData = ParseGasJson(sr.ReadToEnd(), js);
                            Dictionary<string, object> getDict = getData as Dictionary<string, object>;
                            if (getDict != null && getDict.ContainsKey("status"))
                            {
                                string st = Convert.ToString(getDict["status"]);
                                if (st == "success" || st == "error") return getData;
                            }
                        }
                    }
                    catch { }
                }

                byte[] bytes = Encoding.UTF8.GetBytes(requestBody);
                HttpWebRequest postReq = (HttpWebRequest)WebRequest.Create(GAS_TARGET_URL);
                postReq.Method = "POST";
                postReq.ContentType = "text/plain;charset=utf-8";
                postReq.ContentLength = bytes.Length;
                postReq.Timeout = 20000;
                using (Stream reqStream = postReq.GetRequestStream()) reqStream.Write(bytes, 0, bytes.Length);
                using (HttpWebResponse resp = (HttpWebResponse)postReq.GetResponse())
                using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    return ParseGasJson(sr.ReadToEnd(), js);
                }
            }
            catch (Exception ex)
            {
                Dictionary<string, object> err = new Dictionary<string, object>();
                err["status"] = "error";
                err["message"] = ex.Message;
                return err;
            }
        }

        private void TryServeStaticFile(NetworkStream stream, string rawPath)
        {
            string decoded;
            try { decoded = Uri.UnescapeDataString(rawPath); }
            catch
            {
                WriteTextResponse(stream, 400, "Bad Request", "400 Bad Request");
                return;
            }

            if (decoded == "/" || decoded == "\\") decoded = "/mail_activator.html";
            string rel = decoded.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar);
            string rootFull = Path.GetFullPath(rootDir).TrimEnd(Path.DirectorySeparatorChar);
            string filePath = Path.GetFullPath(Path.Combine(rootFull, rel));

            if (!filePath.Equals(rootFull, StringComparison.OrdinalIgnoreCase) &&
                !filePath.StartsWith(rootFull + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            {
                WriteTextResponse(stream, 403, "Forbidden", "403 Forbidden");
                return;
            }

            if (!File.Exists(filePath))
            {
                WriteTextResponse(stream, 404, "Not Found", "404 Not Found: " + decoded);
                return;
            }

            string ext = Path.GetExtension(filePath);
            string contentType;
            if (!MIME_TYPES.TryGetValue(ext, out contentType)) contentType = "application/octet-stream";
            byte[] data = File.ReadAllBytes(filePath);
            WriteHttpResponse(stream, 200, "OK", contentType, data, false);
        }

        private void SendJsonResponse(NetworkStream stream, int code, string statusText, object data)
        {
            string jsonText = CreateSerializer().Serialize(data);
            WriteHttpResponse(stream, code, statusText, "application/json; charset=UTF-8", Encoding.UTF8.GetBytes(jsonText), true);
        }

        private static void WriteTextResponse(NetworkStream stream, int code, string statusText, string text)
        {
            WriteHttpResponse(stream, code, statusText, "text/plain; charset=UTF-8", Encoding.UTF8.GetBytes(text ?? ""), false);
        }

        private static void WriteHttpResponse(NetworkStream stream, int code, string statusText, string contentType, byte[] bodyBytes, bool noStore)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendFormat("HTTP/1.1 {0} {1}\r\n", code, statusText);
            sb.AppendFormat("Content-Type: {0}\r\n", contentType);
            sb.AppendFormat("Content-Length: {0}\r\n", bodyBytes.Length);
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
            sb.Append("Access-Control-Allow-Headers: Content-Type\r\n");
            if (noStore) sb.Append("Cache-Control: no-store\r\n");
            sb.Append("Connection: close\r\n\r\n");

            byte[] headerBytes = Encoding.ASCII.GetBytes(sb.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            if (bodyBytes.Length > 0) stream.Write(bodyBytes, 0, bodyBytes.Length);
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
