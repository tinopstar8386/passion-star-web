using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
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

        [DllImport("user32.dll")]
        public static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        public static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        public static extern IntPtr GetDC(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

        [DllImport("gdi32.dll")]
        public static extern int SetStretchBltMode(IntPtr hdc, int mode);

        [DllImport("gdi32.dll")]
        public static extern bool StretchBlt(IntPtr hdcDest, int xDest, int yDest, int wDest, int hDest, IntPtr hdcSrc, int xSrc, int ySrc, int wSrc, int hSrc, uint rop);

        [DllImport("user32.dll")]
        public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

        [DllImport("user32.dll")]
        public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        public const int GWL_STYLE = -16;
        public const int WS_CAPTION = 0x00C00000;
        public const int WS_THICKFRAME = 0x00040000;
        public const int WS_MINIMIZEBOX = 0x00020000;
        public const int WS_MAXIMIZEBOX = 0x00010000;
        public const int WS_SYSMENU = 0x00080000;
        public const int WS_CHILD = 0x40000000;
        public const int WS_POPUP = unchecked((int)0x80000000);
        public const int WM_NCLBUTTONDOWN = 0x00A1;
        public const int HTCAPTION = 2;

        public const uint SRCCOPY = 0x00CC0020;
        public const int COLORONCOLOR = 3;
    }

    internal sealed class MinimapConfigModel
    {
        public double scale = 1.0;
        public int sizePx = 221;
        public int offsetX = 14;
        public int offsetY = 13;
        public bool flipped = false;
        public bool autoDetect = true;
        public bool calibrateMode = false;
        public bool showMinimapOverlay = false;
        public bool showHudOverlay = true;
        public bool autoWatchPixels = false;
        public int gameWidth = 1920;
        public int gameHeight = 1080;
        public string detectedSource = "disabled";
    }

    internal sealed class CandidateCardOverlayModel
    {
        public int slot = 0;
        public string nameVi = "";
        public string tier = "A";
        public string metaRank = "";
        public int score = 0;
        public double winRate = 0.0;
        public bool isBest = false;
        public string reason = "";
    }

    internal sealed class AdvisorSummaryModel
    {
        public string champName = "Vi";
        public string champTier = "S";
        public string bestAugment = "";
        public int bestScore = 0;
        public string nextItemsText = "";
        public string chosenAugmentsText = "";
        public string tacticalNote = "";
        public List<CandidateCardOverlayModel> candidateCards = new List<CandidateCardOverlayModel>();
    }

    internal static class NativeWinRtOcrEngine
    {
        private static readonly object initLock = new object();
        private static bool initialized = false;
        private static bool available = false;
        private static object ocrEngine = null;
        private static Type ocrResultType = null;
        private static Type bmpDecoderType = null;
        private static Type softBmpType = null;
        private static MethodInfo asRasMethod = null;
        private static MethodInfo createDecMethod = null;
        private static MethodInfo getSbMethod = null;
        private static MethodInfo recogMethod = null;
        private static MethodInfo asTaskMethod = null;
        private static PropertyInfo linesProp = null;
        private static PropertyInfo lineTextProp = null;
        private static PropertyInfo wordsProp = null;
        private static PropertyInfo rectProp = null;

        private static bool EnsureInit()
        {
            if (initialized) return available;
            lock (initLock)
            {
                if (initialized) return available;
                initialized = true;
                try
                {
                    Assembly wrAsm = Assembly.Load("System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089");
                    Type ocrEngineType = Type.GetType("Windows.Media.Ocr.OcrEngine, Windows.Media, ContentType=WindowsRuntime");
                    ocrResultType = Type.GetType("Windows.Media.Ocr.OcrResult, Windows.Media, ContentType=WindowsRuntime");
                    bmpDecoderType = Type.GetType("Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime");
                    softBmpType = Type.GetType("Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics, ContentType=WindowsRuntime");
                    if (ocrEngineType == null || ocrResultType == null || bmpDecoderType == null || softBmpType == null) return false;

                    MethodInfo tryCreate = ocrEngineType.GetMethod("TryCreateFromUserProfileLanguages", BindingFlags.Public | BindingFlags.Static);
                    if (tryCreate == null) return false;
                    ocrEngine = tryCreate.Invoke(null, null);
                    if (ocrEngine == null) return false;

                    Type streamExt = wrAsm.GetType("System.IO.WindowsRuntimeStreamExtensions");
                    Type asyncExt = wrAsm.GetType("System.WindowsRuntimeSystemExtensions");
                    if (streamExt == null || asyncExt == null) return false;

                    asRasMethod = streamExt.GetMethod("AsRandomAccessStream", new Type[] { typeof(Stream) });
                    foreach (MethodInfo m in bmpDecoderType.GetMethods(BindingFlags.Public | BindingFlags.Static))
                    {
                        if (m.Name == "CreateAsync" && m.GetParameters().Length == 1) { createDecMethod = m; break; }
                    }
                    getSbMethod = bmpDecoderType.GetMethod("GetSoftwareBitmapAsync", Type.EmptyTypes);
                    recogMethod = ocrEngineType.GetMethod("RecognizeAsync");
                    foreach (MethodInfo m in asyncExt.GetMethods(BindingFlags.Public | BindingFlags.Static))
                    {
                        if (m.Name == "AsTask" && m.IsGenericMethodDefinition && m.GetGenericArguments().Length == 1 && m.GetParameters().Length == 1)
                        {
                            if (m.GetParameters()[0].ParameterType.Name.StartsWith("IAsyncOperation"))
                            {
                                asTaskMethod = m;
                                break;
                            }
                        }
                    }

                    linesProp = ocrResultType.GetProperty("Lines");
                    Type ocrLineType = Type.GetType("Windows.Media.Ocr.OcrLine, Windows.Media, ContentType=WindowsRuntime");
                    Type ocrWordType = Type.GetType("Windows.Media.Ocr.OcrWord, Windows.Media, ContentType=WindowsRuntime");
                    if (ocrLineType != null)
                    {
                        lineTextProp = ocrLineType.GetProperty("Text");
                        wordsProp = ocrLineType.GetProperty("Words");
                    }
                    if (ocrWordType != null) rectProp = ocrWordType.GetProperty("BoundingRect");

                    available = (asRasMethod != null && createDecMethod != null && getSbMethod != null && recogMethod != null && asTaskMethod != null && linesProp != null);
                }
                catch { available = false; }
                return available;
            }
        }

        private static object AwaitWinRT(object asyncOp, Type resultType)
        {
            MethodInfo generic = asTaskMethod.MakeGenericMethod(resultType);
            object task = generic.Invoke(null, new object[] { asyncOp });
            task.GetType().GetMethod("Wait", Type.EmptyTypes).Invoke(task, null);
            return task.GetType().GetProperty("Result").GetValue(task, null);
        }

        public static string[] RecognizeStackedCards(Bitmap stackedBmp, int bandHeight)
        {
            string[] cards = new string[] { "", "", "" };
            if (stackedBmp == null || bandHeight <= 0 || !EnsureInit()) return cards;

            try
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    stackedBmp.Save(ms, ImageFormat.Bmp);
                    ms.Position = 0;
                    object ras = asRasMethod.Invoke(null, new object[] { ms });
                    object dec = AwaitWinRT(createDecMethod.Invoke(null, new object[] { ras }), bmpDecoderType);
                    object sb = AwaitWinRT(getSbMethod.Invoke(dec, null), softBmpType);
                    object res = AwaitWinRT(recogMethod.Invoke(ocrEngine, new object[] { sb }), ocrResultType);
                    if (res == null) return cards;

                    StringBuilder[] builders = new StringBuilder[] { new StringBuilder(), new StringBuilder(), new StringBuilder() };
                    IEnumerable lines = linesProp.GetValue(res, null) as IEnumerable;
                    if (lines != null)
                    {
                        foreach (object line in lines)
                        {
                            string txt = lineTextProp != null ? Convert.ToString(lineTextProp.GetValue(line, null)) : "";
                            if (string.IsNullOrWhiteSpace(txt)) continue;

                            double yPos = 0.0;
                            if (wordsProp != null && rectProp != null)
                            {
                                IEnumerable words = wordsProp.GetValue(line, null) as IEnumerable;
                                if (words != null)
                                {
                                    foreach (object w in words)
                                    {
                                        object rect = rectProp.GetValue(w, null);
                                        if (rect != null)
                                        {
                                            PropertyInfo yp = rect.GetType().GetProperty("Y");
                                            if (yp != null) { yPos = Convert.ToDouble(yp.GetValue(rect, null)); break; }
                                        }
                                    }
                                }
                            }
                            int idx = Math.Max(0, Math.Min(2, (int)(yPos / bandHeight)));
                            if (builders[idx].Length > 0) builders[idx].Append('\n');
                            builders[idx].Append(txt.Trim());
                        }
                    }

                    for (int i = 0; i < 3; i++) cards[i] = builders[i].ToString();
                }
            }
            catch { }
            return cards;
        }
    }

    internal sealed class AugmentCardsOverlayForm : Form
    {
        private static readonly Color KEY_COLOR = Color.FromArgb(1, 2, 3);
        private List<CandidateCardOverlayModel> cards = new List<CandidateCardOverlayModel>();

        public AugmentCardsOverlayForm()
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = KEY_COLOR;
            TransparencyKey = KEY_COLOR;
            DoubleBuffered = true;
            Width = 1000;
            Height = 140;
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

        protected override bool ShowWithoutActivation { get { return true; } }

        public void UpdateCards(List<CandidateCardOverlayModel> list, Rectangle gameBounds)
        {
            cards = list ?? new List<CandidateCardOverlayModel>();
            int ox = gameBounds.Left + (int)Math.Round(gameBounds.Width * 0.14);
            int oy = gameBounds.Top + (int)Math.Round(gameBounds.Height * 0.055);
            int ow = Math.Max(600, (int)Math.Round(gameBounds.Width * 0.72));
            int oh = Math.Max(108, (int)Math.Round(gameBounds.Height * 0.155));
            if (Left != ox || Top != oy || Width != ow || Height != oh)
            {
                SetBounds(ox, oy, ow, oh);
            }
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (cards == null || cards.Count == 0) return;

            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            // Three cards sit at normalized X centers inside [0.14..0.86]: ~0.18, 0.50, 0.82 of this overlay box
            double[] centers = new double[] { 0.180, 0.500, 0.820 };
            int cardW = Math.Max(180, Math.Min(310, (int)Math.Round(Width * 0.28)));
            int cardH = Math.Max(90, Height - 8);

            using (Font fBadge = new Font("Segoe UI", 8.0f, FontStyle.Bold))
            using (Font fTier = new Font("Segoe UI", 11.5f, FontStyle.Bold))
            using (Font fName = new Font("Segoe UI", 9.0f, FontStyle.Bold))
            using (Font fSub = new Font("Segoe UI", 7.8f, FontStyle.Regular))
            {
                for (int i = 0; i < cards.Count; i++)
                {
                    CandidateCardOverlayModel c = cards[i];
                    if (c.slot < 0 || c.slot > 2 || string.IsNullOrEmpty(c.nameVi)) continue;

                    int cx = (int)Math.Round(Width * centers[c.slot]);
                    int rx = cx - cardW / 2;
                    int ry = 4;

                    Color bgCol = c.isBest ? Color.FromArgb(236, 10, 26, 36) : Color.FromArgb(228, 12, 14, 19);
                    Color borderCol = c.isBest ? Color.FromArgb(255, 36, 232, 204) : Color.FromArgb(200, 71, 85, 105);

                    using (SolidBrush bg = new SolidBrush(bgCol))
                    using (Pen pen = new Pen(borderCol, c.isBest ? 2.4f : 1.4f))
                    {
                        g.FillRectangle(bg, rx, ry, cardW, cardH);
                        g.DrawRectangle(pen, rx, ry, cardW - 1, cardH - 1);
                    }

                    string topTag = c.isBest ? string.Format("★ KHUYÊN CHỌN #{0} • {1}đ", c.slot + 1, c.score) : string.Format("Lựa chọn #{0} • {1}đ", c.slot + 1, c.score);
                    Color tagCol = c.isBest ? Color.FromArgb(255, 36, 232, 204) : Color.FromArgb(255, 148, 163, 184);
                    using (SolidBrush bTag = new SolidBrush(tagCol))
                    {
                        g.DrawString(topTag, fBadge, bTag, rx + 8, ry + 6);
                    }

                    string rankText = !string.IsNullOrEmpty(c.metaRank) ? c.metaRank : c.tier;
                    Color tierCol = (rankText.StartsWith("S")) ? Color.FromArgb(255, 251, 191, 36) : Color.FromArgb(255, 56, 189, 248);
                    using (SolidBrush bTier = new SolidBrush(tierCol))
                    {
                        g.DrawString(rankText, fTier, bTier, rx + cardW - 44, ry + 4);
                    }

                    using (SolidBrush bWhite = new SolidBrush(Color.FromArgb(255, 248, 250, 252)))
                    {
                        g.DrawString(c.nameVi, fName, bWhite, new RectangleF(rx + 8, ry + 24, cardW - 50, 22));
                    }

                    string detail = c.winRate > 0
                        ? string.Format("WR {0:0.0}% • {1}", c.winRate, c.reason)
                        : (string.IsNullOrEmpty(c.reason) ? "Đề xuất theo tướng & lõi hiện tại" : c.reason);
                    using (SolidBrush bSub = new SolidBrush(Color.FromArgb(255, 203, 213, 225)))
                    {
                        g.DrawString(detail, fSub, bSub, new RectangleF(rx + 8, ry + 48, cardW - 16, cardH - 52));
                    }
                }
            }
        }
    }

    internal sealed class BlitzDesktopShellForm : Form
    {
        private readonly MayhemControllerForm controller;
        private readonly Panel titleBar;
        private readonly Label lblTitle;
        private readonly Label lblLiveStatus;
        private readonly Button btnPinTop;
        private readonly Button btnMin;
        private readonly Button btnMax;
        private readonly Button btnClose;
        private readonly Panel hostPanel;

        private IntPtr embeddedHwnd = IntPtr.Zero;
        private int chromeTitlebarTrim = 33;
        private bool topPinned = false;

        public BlitzDesktopShellForm(MayhemControllerForm ownerController, Icon appIcon)
        {
            controller = ownerController;
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.CenterScreen;
            Width = 1420;
            Height = 860;
            MinimumSize = new Size(1080, 700);
            BackColor = Color.FromArgb(12, 14, 19);
            Text = "Passion Mayhem — Blitz Edition";
            if (appIcon != null) Icon = appIcon;

            titleBar = new Panel
            {
                Dock = DockStyle.Top,
                Height = 34,
                BackColor = Color.FromArgb(9, 11, 16)
            };

            lblTitle = new Label
            {
                Text = "  ⚡ PASSION MAYHEM • BLITZ NATIVE",
                ForeColor = Color.FromArgb(36, 232, 204),
                Font = new Font("Segoe UI", 9.0f, FontStyle.Bold),
                AutoSize = false,
                Width = 280,
                Height = 34,
                Left = 6,
                Top = 0,
                TextAlign = ContentAlignment.MiddleLeft
            };

            lblLiveStatus = new Label
            {
                Text = "● Chờ kết nối Liên Minh Huyền Thoại...",
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                AutoSize = false,
                Width = 340,
                Height = 34,
                Left = 290,
                Top = 0,
                TextAlign = ContentAlignment.MiddleLeft
            };

            btnClose = MakeCaptionBtn("✕", 42, Color.FromArgb(248, 113, 113));
            btnMax = MakeCaptionBtn("□", 40, Color.FromArgb(203, 213, 225));
            btnMin = MakeCaptionBtn("—", 40, Color.FromArgb(203, 213, 225));
            btnPinTop = MakeCaptionBtn("📌", 40, Color.FromArgb(148, 163, 184));

            btnClose.Click += delegate { Hide(); };
            btnMax.Click += delegate
            {
                WindowState = (WindowState == FormWindowState.Maximized) ? FormWindowState.Normal : FormWindowState.Maximized;
                SyncEmbeddedBounds();
            };
            btnMin.Click += delegate { WindowState = FormWindowState.Minimized; };
            btnPinTop.Click += delegate
            {
                topPinned = !topPinned;
                TopMost = topPinned;
                btnPinTop.ForeColor = topPinned ? Color.FromArgb(36, 232, 204) : Color.FromArgb(148, 163, 184);
            };

            MouseEventHandler dragHandler = delegate(object s, MouseEventArgs e)
            {
                if (e.Button == MouseButtons.Left)
                {
                    if (e.Clicks >= 2)
                    {
                        WindowState = (WindowState == FormWindowState.Maximized) ? FormWindowState.Normal : FormWindowState.Maximized;
                        SyncEmbeddedBounds();
                    }
                    else
                    {
                        NativeMethods.ReleaseCapture();
                        NativeMethods.SendMessage(Handle, NativeMethods.WM_NCLBUTTONDOWN, new IntPtr(NativeMethods.HTCAPTION), IntPtr.Zero);
                    }
                }
            };
            titleBar.MouseDown += dragHandler;
            lblTitle.MouseDown += dragHandler;
            lblLiveStatus.MouseDown += dragHandler;

            titleBar.Controls.Add(lblTitle);
            titleBar.Controls.Add(lblLiveStatus);
            titleBar.Controls.Add(btnPinTop);
            titleBar.Controls.Add(btnMin);
            titleBar.Controls.Add(btnMax);
            titleBar.Controls.Add(btnClose);

            hostPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.FromArgb(12, 14, 19)
            };

            Controls.Add(hostPanel);
            Controls.Add(titleBar);

            Resize += delegate
            {
                LayoutTitleButtons();
                SyncEmbeddedBounds();
            };
            FormClosing += delegate(object s, FormClosingEventArgs e)
            {
                controller.NotifyShellClosing(e.CloseReason);
            };

            LayoutTitleButtons();
        }

        private static Button MakeCaptionBtn(string txt, int width, Color fg)
        {
            Button b = new Button
            {
                Text = txt,
                Width = width,
                Height = 34,
                Top = 0,
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(9, 11, 16),
                ForeColor = fg,
                Font = new Font("Segoe UI", 9.0f, FontStyle.Bold),
                Cursor = Cursors.Hand,
                TabStop = false
            };
            b.FlatAppearance.BorderSize = 0;
            b.FlatAppearance.MouseOverBackColor = Color.FromArgb(28, 34, 48);
            return b;
        }

        private void LayoutTitleButtons()
        {
            int right = Width;
            btnClose.Left = right - btnClose.Width;
            btnMax.Left = btnClose.Left - btnMax.Width;
            btnMin.Left = btnMax.Left - btnMin.Width;
            btnPinTop.Left = btnMin.Left - btnPinTop.Width;
        }

        public void SetLiveStatus(string text, bool active)
        {
            if (IsDisposed) return;
            if (lblLiveStatus.Text != text) lblLiveStatus.Text = text;
            lblLiveStatus.ForeColor = active ? Color.FromArgb(36, 232, 204) : Color.FromArgb(148, 163, 184);
        }

        public void SetChromeTrimHeight(int trimPx)
        {
            if (trimPx >= 0 && trimPx <= 80 && trimPx != chromeTitlebarTrim)
            {
                chromeTitlebarTrim = trimPx;
                SyncEmbeddedBounds();
            }
        }

        public bool EmbedWindow(IntPtr childHwnd)
        {
            if (childHwnd == IntPtr.Zero || !NativeMethods.IsWindow(childHwnd)) return false;
            if (embeddedHwnd == childHwnd) return true;
            try
            {
                int style = NativeMethods.GetWindowLong(childHwnd, NativeMethods.GWL_STYLE);
                int cleanStyle = (style & ~(NativeMethods.WS_CAPTION | NativeMethods.WS_THICKFRAME | NativeMethods.WS_MINIMIZEBOX | NativeMethods.WS_MAXIMIZEBOX | NativeMethods.WS_SYSMENU | NativeMethods.WS_POPUP)) | NativeMethods.WS_CHILD;
                NativeMethods.SetWindowLong(childHwnd, NativeMethods.GWL_STYLE, cleanStyle);
                NativeMethods.SetParent(childHwnd, hostPanel.Handle);
                embeddedHwnd = childHwnd;
                SyncEmbeddedBounds();
                return true;
            }
            catch { return false; }
        }

        public void SyncEmbeddedBounds()
        {
            if (embeddedHwnd != IntPtr.Zero && NativeMethods.IsWindow(embeddedHwnd) && hostPanel.Width > 50 && hostPanel.Height > 50)
            {
                int trim = chromeTitlebarTrim;
                NativeMethods.MoveWindow(embeddedHwnd, 0, -trim, hostPanel.Width, hostPanel.Height + trim, true);
            }
        }
    }

    internal sealed class HudOverlayForm : Form
    {
        private readonly MayhemControllerForm owner;
        private AdvisorSummaryModel summary = new AdvisorSummaryModel();
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
            BackColor = Color.FromArgb(12, 14, 19);
            Opacity = 0.90;
            Width = 330;
            Height = 122;
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

        protected override bool ShowWithoutActivation { get { return true; } }

        public void UpdateData(AdvisorSummaryModel sum)
        {
            summary = sum;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            using (Pen borderPen = new Pen(Color.FromArgb(210, 36, 232, 204), 1.5f))
            {
                g.DrawRectangle(borderPen, 0, 0, Width - 1, Height - 1);
            }

            using (Font fTitle = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            using (Font fBody = new Font("Segoe UI", 8.5f, FontStyle.Regular))
            using (Font fBold = new Font("Segoe UI", 8.5f, FontStyle.Bold))
            using (Font fSmall = new Font("Segoe UI", 7.5f, FontStyle.Regular))
            using (SolidBrush brGold = new SolidBrush(Color.FromArgb(253, 230, 138)))
            using (SolidBrush brCyan = new SolidBrush(Color.FromArgb(36, 232, 204)))
            using (SolidBrush brGreen = new SolidBrush(Color.FromArgb(110, 231, 183)))
            using (SolidBrush brMuted = new SolidBrush(Color.FromArgb(148, 163, 184)))
            using (SolidBrush brWhite = new SolidBrush(Color.FromArgb(241, 245, 249)))
            {
                g.DrawString(string.Format("BLITZ MAYHEM • {0} ({1})", summary.champName, summary.champTier), fTitle, brGold, 10, 8);
                g.DrawString("AUTO-SYNC", fBold, brCyan, Width - 82, 9);

                string augLine = string.IsNullOrEmpty(summary.bestAugment)
                    ? "Mở 3 Lõi trong game -> tự hiện điểm & khóa tự động"
                    : string.Format("★ Gợi ý #1: {0} ({1}đ)", summary.bestAugment, summary.bestScore);
                g.DrawString(augLine, fBold, brGreen, new RectangleF(10, 30, Width - 20, 18));

                string chosenLine = string.IsNullOrEmpty(summary.chosenAugmentsText)
                    ? "Lõi đã chọn: Chưa khóa lõi nào"
                    : "Đã khóa: " + summary.chosenAugmentsText;
                g.DrawString(chosenLine, fSmall, brCyan, new RectangleF(10, 50, Width - 20, 16));

                string itemsLine = string.IsNullOrEmpty(summary.nextItemsText)
                    ? "Đồ: Đang đồng bộ từ Shop PeakBuild 26.22..."
                    : "Đồ: " + summary.nextItemsText;
                g.DrawString(itemsLine, fBody, brWhite, new RectangleF(10, 68, Width - 20, 18));

                g.DrawString("Alt+Shift+Q: Quét Lõi ngay | Alt+Shift+O: Ẩn HUD | Alt+Shift+M: Mở App", fSmall, brMuted, new RectangleF(10, 96, Width - 20, 16));
            }
        }
    }

    internal sealed class MayhemControllerForm : Form
    {
        private const int HK_TOGGLE_APP = 101;
        private const int HK_TOGGLE_OVERLAY = 102;
        private const int HK_SCAN_AUGMENTS = 104;
        private const int HK_SCAN_COMBAT = 105;

        private const string WAKE_EVENT_NAME = "Local\\PassionStar_Mayhem_Desktop_Wakeup_Event";

        private readonly string appDir;
        private readonly string iconPath;
        private readonly int serverPort;
        private readonly string baseUrl;
        private readonly JavaScriptSerializer json = new JavaScriptSerializer();

        private Process nodeProcess;
        private EmbeddedMayhemHttpServer fallbackServer;
        private Process browserProcess;
        private IntPtr appHwnd = IntPtr.Zero;
        private DateTime launchTimeUtc = DateTime.UtcNow;

        private bool isHiddenToTray = false;
        private bool isShuttingDown = false;
        private bool overlaysEnabled = true;

        private AdvisorSummaryModel advisorSummary = new AdvisorSummaryModel();
        private long lastHandledPendingActionSeq = 0;
        private bool wasLeftMouseDown = false;
        private bool nativeModalOpen = false;
        private int nativeModalOpenStreak = 0;
        private int nativeModalCloseStreak = 0;
        private byte[] lastCardTitleSample = null;
        private DateTime lastNativeAutoCaptureUtc = DateTime.MinValue;
        private int nativeCaptureCooldownTicks = 0;

        private BlitzDesktopShellForm desktopShell;
        private AugmentCardsOverlayForm cardsOverlayForm;
        private HudOverlayForm hudForm;

        private NotifyIcon trayIcon;
        private Icon loadedTrayIcon;
        private Icon loadedBigIcon;
        private ContextMenuStrip trayMenu;
        private ToolStripMenuItem menuShowHide;
        private ToolStripMenuItem menuToggleOverlay;

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

        public void NotifyShellClosing(CloseReason reason)
        {
            if (reason == CloseReason.ApplicationExitCall || reason == CloseReason.TaskManagerClosing || reason == CloseReason.WindowsShutDown)
            {
                ShutdownAll(true);
            }
            else
            {
                isHiddenToTray = true;
            }
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

            menuShowHide = new ToolStripMenuItem("Hiện / Ẩn Passion Mayhem Blitz (Alt+Shift+M)");
            menuShowHide.Font = new Font(menuShowHide.Font, FontStyle.Bold);
            menuShowHide.Click += delegate { ToggleShowHide(); };

            menuToggleOverlay = new ToolStripMenuItem("Bật / Tắt Overlay 3 Lõi & HUD Trong Game (Alt+Shift+O)");
            menuToggleOverlay.Checked = true;
            menuToggleOverlay.Click += delegate { ToggleOverlays(); };

            ToolStripMenuItem menuScanAug = new ToolStripMenuItem("⚡ Quét Nhanh 3 Thẻ Lõi Ngay (Alt+Shift+Q)");
            menuScanAug.Click += delegate { CaptureAndUploadFrame("scan-aug"); };

            ToolStripMenuItem menuScanTab = new ToolStripMenuItem("🔍 Chụp & Quét Bảng Tab / Trận (Alt+Shift+E)");
            menuScanTab.Click += delegate { CaptureAndUploadFrame("scan-combat"); };

            ToolStripMenuItem menuShortcut = new ToolStripMenuItem("Tạo lối tắt ngoài Desktop");
            menuShortcut.Click += delegate { CreateDesktopShortcut(true); };

            ToolStripMenuItem menuExit = new ToolStripMenuItem("Thoát hoàn toàn");
            menuExit.Click += delegate { ShutdownAll(true); };

            trayMenu.Items.Add(menuShowHide);
            trayMenu.Items.Add(menuToggleOverlay);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(menuScanAug);
            trayMenu.Items.Add(menuScanTab);
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(menuShortcut);
            trayMenu.Items.Add(menuExit);

            trayIcon = new NotifyIcon();
            trayIcon.Icon = loadedTrayIcon;
            trayIcon.Text = "Passion Mayhem Blitz Edition";
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
            NativeMethods.RegisterHotKey(h, HK_TOGGLE_APP, modAltShift, (uint)Keys.M);
            NativeMethods.RegisterHotKey(h, HK_TOGGLE_OVERLAY, modAltShift, (uint)Keys.O);
            NativeMethods.RegisterHotKey(h, HK_SCAN_AUGMENTS, modAltShift, (uint)Keys.Q);
            NativeMethods.RegisterHotKey(h, HK_SCAN_COMBAT, modAltShift, (uint)Keys.E);
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
                string full = Path.GetFullPath(exePath.Trim().Trim('"'));
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
                if (quoted.Success && File.Exists(quoted.Groups[1].Value)) return quoted.Groups[1].Value;
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
            string agyFromCmd = TryExtractExeFromCmd(agyCmd);
            AddRuntimeCandidate(list, seen, agyFromCmd, true);
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
                MessageBox.Show("Không thể khởi động máy chủ nội bộ (Node.js) trên cổng " + serverPort, "Passion Mayhem Blitz", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            string browserExe = FindBrowserExecutable();
            if (string.IsNullOrEmpty(browserExe))
            {
                MessageBox.Show("Không tìm thấy Microsoft Edge hoặc Google Chrome.", "Passion Mayhem Blitz", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ShutdownAll(true);
                return;
            }

            desktopShell = new BlitzDesktopShellForm(this, loadedBigIcon);
            desktopShell.Show();

            string profileDir = Path.Combine(appDir, ".tmp_mayhem_desktop_profile");
            if (!Directory.Exists(profileDir))
            {
                try { Directory.CreateDirectory(profileDir); } catch { }
            }

            string appUrl = baseUrl + "/aram-mayhem.html?desktop=1";
            string args = string.Format(
                "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1420,860 --no-first-run --no-default-browser-check --disable-features=msEdgeSidebarV2",
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

            cardsOverlayForm = new AugmentCardsOverlayForm();
            hudForm = new HudOverlayForm(this);

            monitorTimer = new System.Windows.Forms.Timer();
            monitorTimer.Interval = 250;
            monitorTimer.Tick += MonitorWindowTick;
            monitorTimer.Start();

            overlayTickTimer = new System.Windows.Forms.Timer();
            overlayTickTimer.Interval = 220;
            overlayTickTimer.Tick += OverlayTick;
            overlayTickTimer.Start();

            StartStateSyncThread();
        }

        private bool EnsureNodeServerRunning()
        {
            if (CheckHealthEndpoint(serverPort)) return true;

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
                    try { proc = Process.Start(psi); }
                    catch { proc = null; }
                    if (proc == null) continue;

                    DateTime deadline = DateTime.UtcNow.AddSeconds(6);
                    while (DateTime.UtcNow < deadline)
                    {
                        if (CheckHealthEndpoint(serverPort))
                        {
                            nodeProcess = proc;
                            return true;
                        }
                        if (proc.HasExited) break;
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
                fallbackServer = new EmbeddedMayhemHttpServer(appDir, serverPort);
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
                    if (desktopShell != null && !desktopShell.IsDisposed)
                    {
                        desktopShell.EmbedWindow(appHwnd);
                    }
                }
                else if ((DateTime.UtcNow - launchTimeUtc).TotalSeconds > 20 && browserProcess != null && browserProcess.HasExited)
                {
                    ShutdownAll(true);
                }
            }
            else if (desktopShell != null && !desktopShell.IsDisposed && desktopShell.Visible)
            {
                desktopShell.SyncEmbeddedBounds();
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

            bool shouldShowHud = overlaysEnabled && leagueHwnd != IntPtr.Zero;

            if (desktopShell != null && !desktopShell.IsDisposed)
            {
                if (leagueHwnd != IntPtr.Zero)
                {
                    desktopShell.SetLiveStatus("● Đang bắt trận LMHT (" + advisorSummary.champName + ") — Auto Lõi & Shop", true);
                }
                else
                {
                    desktopShell.SetLiveStatus("● Chờ Liên Minh Huyền Thoại / Sảnh LCU...", false);
                }
            }

            if (leagueHwnd != IntPtr.Zero && gameFocused)
            {
                WatchCardClickInGame(gameBounds);
                CheckAndAutoCaptureAugmentModal(gameBounds);
            }
            else if (nativeModalOpen)
            {
                nativeModalOpen = false;
                nativeModalOpenStreak = 0;
                nativeModalCloseStreak = 0;
                lastCardTitleSample = null;
                PushModalOpenStateToServer(false);
            }

            if (cardsOverlayForm != null && !cardsOverlayForm.IsDisposed)
            {
                List<CandidateCardOverlayModel> candSnapshot = null;
                lock (syncLock)
                {
                    if (advisorSummary.candidateCards != null && advisorSummary.candidateCards.Count > 0)
                    {
                        candSnapshot = new List<CandidateCardOverlayModel>(advisorSummary.candidateCards);
                    }
                }

                if (overlaysEnabled && leagueHwnd != IntPtr.Zero && gameFocused && nativeModalOpen && candSnapshot != null && candSnapshot.Count > 0)
                {
                    if (!cardsOverlayForm.Visible) cardsOverlayForm.Show();
                    cardsOverlayForm.UpdateCards(candSnapshot, gameBounds);
                    NativeMethods.SetWindowPos(cardsOverlayForm.Handle, NativeMethods.HWND_TOPMOST, 0, 0, 0, 0, NativeMethods.SWP_NOMOVE | NativeMethods.SWP_NOSIZE | NativeMethods.SWP_NOACTIVATE);
                }
                else if (cardsOverlayForm.Visible)
                {
                    cardsOverlayForm.Hide();
                }
            }

            if (hudForm != null && !hudForm.IsDisposed)
            {
                if (shouldShowHud)
                {
                    if (!hudForm.Visible)
                    {
                        hudForm.Left = gameBounds.Left + 18;
                        hudForm.Top = gameBounds.Top + 18;
                        hudForm.Show();
                    }
                    hudForm.UpdateData(advisorSummary);
                    NativeMethods.SetWindowPos(hudForm.Handle, NativeMethods.HWND_TOPMOST, 0, 0, 0, 0, NativeMethods.SWP_NOMOVE | NativeMethods.SWP_NOSIZE | NativeMethods.SWP_NOACTIVATE);
                }
                else if (hudForm.Visible)
                {
                    hudForm.Hide();
                }
            }
        }

        private void WatchCardClickInGame(Rectangle gameBounds)
        {
            if (gameBounds.Width < 640 || gameBounds.Height < 480) return;
            bool isDown = (NativeMethods.GetAsyncKeyState(0x01) & 0x8000) != 0;
            if (isDown && !wasLeftMouseDown)
            {
                Point pt = Cursor.Position;
                double nx = (pt.X - gameBounds.Left) / (double)gameBounds.Width;
                double ny = (pt.Y - gameBounds.Top) / (double)gameBounds.Height;
                if (ny >= 0.22 && ny <= 0.72)
                {
                    int idx = -1;
                    if (nx >= 0.16 && nx <= 0.38) idx = 0;
                    else if (nx >= 0.39 && nx <= 0.61) idx = 1;
                    else if (nx >= 0.62 && nx <= 0.84) idx = 2;
                    if (idx >= 0)
                    {
                        ThreadPool.QueueUserWorkItem(delegate
                        {
                            try
                            {
                                Dictionary<string, object> clk = new Dictionary<string, object>();
                                clk["index"] = idx;
                                Dictionary<string, object> body = new Dictionary<string, object>();
                                body["lastCardClick"] = clk;
                                HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                            }
                            catch { }
                        });
                    }
                }
            }
            wasLeftMouseDown = isDown;
        }

        private void PushModalOpenStateToServer(bool isOpen)
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["modalOpen"] = isOpen;
                    HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                }
                catch { }
            });
        }

        private static string EncodeBitmapToJpegBase64(Bitmap bmp, long quality)
        {
            using (MemoryStream ms = new MemoryStream())
            {
                ImageCodecInfo jpgEncoder = null;
                ImageCodecInfo[] codecs = ImageCodecInfo.GetImageDecoders();
                for (int i = 0; i < codecs.Length; i++)
                {
                    if (codecs[i].FormatID == ImageFormat.Jpeg.Guid)
                    {
                        jpgEncoder = codecs[i];
                        break;
                    }
                }
                if (jpgEncoder != null)
                {
                    using (EncoderParameters ep = new EncoderParameters(1))
                    {
                        ep.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
                        bmp.Save(ms, jpgEncoder, ep);
                    }
                }
                else
                {
                    bmp.Save(ms, ImageFormat.Jpeg);
                }
                return Convert.ToBase64String(ms.ToArray());
            }
        }

        private void CheckAndAutoCaptureAugmentModal(Rectangle gameBounds)
        {
            if (gameBounds.Width < 800 || gameBounds.Height < 600) return;

            const int SW = 240;
            const int SH = 135;
            try
            {
                using (Bitmap sampleBmp = new Bitmap(SW, SH, PixelFormat.Format24bppRgb))
                {
                    using (Graphics gDest = Graphics.FromImage(sampleBmp))
                    {
                        IntPtr hdcDest = IntPtr.Zero;
                        IntPtr hdcSrc = IntPtr.Zero;
                        try
                        {
                            hdcSrc = NativeMethods.GetDC(IntPtr.Zero);
                            hdcDest = gDest.GetHdc();
                            if (hdcSrc != IntPtr.Zero && hdcDest != IntPtr.Zero)
                            {
                                NativeMethods.SetStretchBltMode(hdcDest, NativeMethods.COLORONCOLOR);
                                NativeMethods.StretchBlt(
                                    hdcDest, 0, 0, SW, SH,
                                    hdcSrc, gameBounds.Left, gameBounds.Top, gameBounds.Width, gameBounds.Height,
                                    NativeMethods.SRCCOPY
                                );
                            }
                        }
                        finally
                        {
                            if (hdcDest != IntPtr.Zero) try { gDest.ReleaseHdc(hdcDest); } catch { }
                            if (hdcSrc != IntPtr.Zero) try { NativeMethods.ReleaseDC(IntPtr.Zero, hdcSrc); } catch { }
                        }
                    }

                    int[] zoneX0 = new int[] { (int)Math.Round(SW * 0.18), (int)Math.Round(SW * 0.41), (int)Math.Round(SW * 0.64) };
                    int[] zoneX1 = new int[] { (int)Math.Round(SW * 0.36), (int)Math.Round(SW * 0.59), (int)Math.Round(SW * 0.82) };
                    int y0 = (int)Math.Round(SH * 0.24);
                    int y1 = (int)Math.Round(SH * 0.72);

                    int validPanels = 0;
                    bool centerLooksLikeCard = false;

                    for (int zi = 0; zi < 3; zi++)
                    {
                        int total = 0;
                        int darkNavy = 0;
                        int brightText = 0;
                        for (int y = y0; y < y1; y += 2)
                        {
                            for (int x = zoneX0[zi]; x < zoneX1[zi]; x += 2)
                            {
                                Color c = sampleBmp.GetPixel(x, y);
                                total++;
                                if (c.R < 56 && c.G < 68 && c.B < 105 && c.B >= c.R - 3) darkNavy++;
                                if (c.R > 160 && c.G > 150 && c.B > 120) brightText++;
                            }
                        }
                        int safeT = Math.Max(1, total);
                        double darkPct = (darkNavy * 100.0) / safeT;
                        double brightPct = (brightText * 100.0) / safeT;
                        if (darkPct >= 26.0 && brightPct >= 1.2 && brightPct <= 35.0) validPanels++;
                        if (zi == 1 && darkPct >= 22.0 && brightPct >= 1.0) centerLooksLikeCard = true;
                    }

                    bool isModalOpen = validPanels >= 2 && centerLooksLikeCard;

                    // Extract compact luminance sample from the title bands of all 3 cards to detect Rerolls
                    int titleY0 = (int)Math.Round(SH * 0.42);
                    int titleY1 = (int)Math.Round(SH * 0.56);
                    List<byte> sigList = new List<byte>(280);
                    for (int zi = 0; zi < 3; zi++)
                    {
                        for (int y = titleY0; y < titleY1; y += 2)
                        {
                            for (int x = zoneX0[zi] + 2; x < zoneX1[zi] - 2; x += 3)
                            {
                                Color c = sampleBmp.GetPixel(x, y);
                                int luma = (c.R * 3 + c.G * 6 + c.B) / 10;
                                sigList.Add((byte)luma);
                            }
                        }
                    }
                    byte[] curSig = sigList.ToArray();

                    if (isModalOpen)
                    {
                        nativeModalCloseStreak = 0;
                        nativeModalOpenStreak++;

                        bool justOpened = !nativeModalOpen && (validPanels == 3 || nativeModalOpenStreak >= 2);
                        bool rerolled = false;
                        if (nativeModalOpen && lastCardTitleSample != null && lastCardTitleSample.Length == curSig.Length && curSig.Length > 0)
                        {
                            int diffCount = 0;
                            for (int k = 0; k < curSig.Length; k++)
                            {
                                if (Math.Abs((int)curSig[k] - (int)lastCardTitleSample[k]) >= 22) diffCount++;
                            }
                            if ((double)diffCount / curSig.Length >= 0.14) rerolled = true;
                        }

                        if (justOpened || rerolled)
                        {
                            nativeModalOpen = true;
                            lastCardTitleSample = curSig;
                            PushModalOpenStateToServer(true);
                            nativeCaptureCooldownTicks = 1;
                            if (justOpened && (DateTime.UtcNow - lastNativeAutoCaptureUtc).TotalMilliseconds >= 650)
                            {
                                lastNativeAutoCaptureUtc = DateTime.UtcNow;
                                nativeCaptureCooldownTicks = 0;
                                RunInstantThreeCardOcrAsync(gameBounds);
                            }
                        }
                        else if (nativeCaptureCooldownTicks > 0)
                        {
                            nativeCaptureCooldownTicks--;
                            if (nativeCaptureCooldownTicks == 0 && (DateTime.UtcNow - lastNativeAutoCaptureUtc).TotalMilliseconds >= 650)
                            {
                                lastNativeAutoCaptureUtc = DateTime.UtcNow;
                                lastCardTitleSample = curSig;
                                RunInstantThreeCardOcrAsync(gameBounds);
                            }
                        }
                    }
                    else
                    {
                        nativeModalOpenStreak = 0;
                        nativeCaptureCooldownTicks = 0;
                        if (nativeModalOpen)
                        {
                            nativeModalCloseStreak++;
                            if (nativeModalCloseStreak >= 2)
                            {
                                nativeModalOpen = false;
                                nativeModalCloseStreak = 0;
                                lastCardTitleSample = null;
                                PushModalOpenStateToServer(false);
                            }
                        }
                    }
                }
            }
            catch { }
        }

        private void RunInstantThreeCardOcrAsync(Rectangle gameBounds)
        {
            if (gameBounds.Width < 800 || gameBounds.Height < 600) return;

            int srcH = Math.Max(80, (int)Math.Round(gameBounds.Height * 0.255));
            int srcW = Math.Max(120, (int)Math.Round(gameBounds.Width * 0.195));
            int srcY = gameBounds.Top + (int)Math.Round(gameBounds.Height * 0.375);
            double[] cardXFrac = new double[] { 0.175, 0.405, 0.635 };

            const int bandW = 420;
            const int bandH = 180;

            try
            {
                Bitmap stacked = new Bitmap(bandW, bandH * 3, PixelFormat.Format24bppRgb);
                using (Graphics gs = Graphics.FromImage(stacked))
                {
                    gs.Clear(Color.FromArgb(14, 22, 38));
                    gs.InterpolationMode = InterpolationMode.HighQualityBicubic;

                    using (Bitmap rawCard = new Bitmap(srcW, srcH, PixelFormat.Format24bppRgb))
                    using (Graphics gr = Graphics.FromImage(rawCard))
                    {
                        for (int i = 0; i < 3; i++)
                        {
                            int sx = gameBounds.Left + (int)Math.Round(gameBounds.Width * cardXFrac[i]);
                            gr.CopyFromScreen(sx, srcY, 0, 0, new Size(srcW, srcH), CopyPixelOperation.SourceCopy);
                            gs.DrawImage(rawCard, 12, i * bandH + 10, bandW - 24, bandH - 20);
                        }
                    }
                }

                ThreadPool.QueueUserWorkItem(delegate
                {
                    try
                    {
                        string[] ocrTexts;
                        using (stacked)
                        {
                            ocrTexts = NativeWinRtOcrEngine.RecognizeStackedCards(stacked, bandH);
                        }

                        int nonEmpty = 0;
                        for (int i = 0; i < 3; i++)
                        {
                            if (!string.IsNullOrWhiteSpace(ocrTexts[i])) nonEmpty++;
                        }

                        if (nonEmpty >= 2)
                        {
                            Dictionary<string, object> body = new Dictionary<string, object>();
                            body["modalOpen"] = true;
                            body["nativeOcrCards"] = ocrTexts;
                            HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body));
                        }
                        else
                        {
                            CaptureAndUploadFrame("scan-aug", true);
                        }
                    }
                    catch
                    {
                        try { CaptureAndUploadFrame("scan-aug", true); } catch { }
                    }
                });
            }
            catch { }
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
                    Thread.Sleep(260);
                }
            });
            syncThread.IsBackground = true;
            syncThread.Start();
        }

        private void ApplyServerState(Dictionary<string, object> data)
        {
            string pendingActionToRun = null;
            long pendingSeq = 0;
            int trimHeight = -1;

            lock (syncLock)
            {
                if (data.ContainsKey("chromeTitlebarHeight") && data["chromeTitlebarHeight"] != null)
                {
                    int th = Convert.ToInt32(data["chromeTitlebarHeight"]);
                    if (th >= 0 && th <= 80) trimHeight = th;
                }

                if (data.ContainsKey("advisorSummary") && data["advisorSummary"] is Dictionary<string, object>)
                {
                    Dictionary<string, object> ad = (Dictionary<string, object>)data["advisorSummary"];
                    if (ad.ContainsKey("champName")) advisorSummary.champName = Convert.ToString(ad["champName"]);
                    if (ad.ContainsKey("champTier")) advisorSummary.champTier = Convert.ToString(ad["champTier"]);
                    if (ad.ContainsKey("bestAugment")) advisorSummary.bestAugment = Convert.ToString(ad["bestAugment"]);
                    if (ad.ContainsKey("bestScore")) advisorSummary.bestScore = Convert.ToInt32(ad["bestScore"]);
                    if (ad.ContainsKey("tacticalNote")) advisorSummary.tacticalNote = Convert.ToString(ad["tacticalNote"]);
                    if (ad.ContainsKey("chosenAugments") && ad["chosenAugments"] is object[])
                    {
                        object[] chosen = (object[])ad["chosenAugments"];
                        List<string> cList = new List<string>();
                        for (int i = 0; i < chosen.Length; i++)
                        {
                            string s = Convert.ToString(chosen[i]);
                            if (!string.IsNullOrEmpty(s)) cList.Add(s);
                        }
                        advisorSummary.chosenAugmentsText = string.Join(" + ", cList.ToArray());
                    }
                    if (ad.ContainsKey("nextItems") && ad["nextItems"] is object[])
                    {
                        object[] items = (object[])ad["nextItems"];
                        List<string> list = new List<string>();
                        for (int i = 0; i < items.Length && i < 4; i++) list.Add(Convert.ToString(items[i]));
                        advisorSummary.nextItemsText = string.Join(" • ", list.ToArray());
                    }
                    if (ad.ContainsKey("candidateCards") && ad["candidateCards"] is object[])
                    {
                        object[] cArr = (object[])ad["candidateCards"];
                        List<CandidateCardOverlayModel> cardsList = new List<CandidateCardOverlayModel>();
                        for (int i = 0; i < cArr.Length; i++)
                        {
                            Dictionary<string, object> cd = cArr[i] as Dictionary<string, object>;
                            if (cd == null) continue;
                            cardsList.Add(new CandidateCardOverlayModel
                            {
                                slot = cd.ContainsKey("slot") && cd["slot"] != null ? Convert.ToInt32(cd["slot"]) : i,
                                nameVi = cd.ContainsKey("nameVi") && cd["nameVi"] != null ? Convert.ToString(cd["nameVi"]) : "",
                                tier = cd.ContainsKey("tier") && cd["tier"] != null ? Convert.ToString(cd["tier"]) : "A",
                                metaRank = cd.ContainsKey("metaRank") && cd["metaRank"] != null ? Convert.ToString(cd["metaRank"]) : "",
                                score = cd.ContainsKey("score") && cd["score"] != null ? Convert.ToInt32(cd["score"]) : 0,
                                winRate = cd.ContainsKey("winRate") && cd["winRate"] != null ? Convert.ToDouble(cd["winRate"]) : 0.0,
                                isBest = cd.ContainsKey("isBest") && cd["isBest"] != null && Convert.ToBoolean(cd["isBest"]),
                                reason = cd.ContainsKey("reason") && cd["reason"] != null ? Convert.ToString(cd["reason"]) : ""
                            });
                        }
                        advisorSummary.candidateCards = cardsList;
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

            if (trimHeight >= 0 && desktopShell != null && !desktopShell.IsDisposed)
            {
                SafeBeginInvoke(delegate { desktopShell.SetChromeTrimHeight(trimHeight); });
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
            else if (action == "toggle-overlay")
            {
                ToggleOverlays();
            }
        }

        private void CaptureAndUploadFrame(string scanAction)
        {
            CaptureAndUploadFrame(scanAction, false);
        }

        private void CaptureAndUploadFrame(string scanAction, bool silentBalloon)
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
                    string base64 = EncodeBitmapToJpegBase64(bmp, 84L);

                    Dictionary<string, object> frameObj = new Dictionary<string, object>();
                    frameObj["base64"] = base64;
                    frameObj["mimeType"] = "image/jpeg";
                    frameObj["action"] = scanAction;
                    frameObj["silent"] = silentBalloon;

                    Dictionary<string, object> body = new Dictionary<string, object>();
                    body["lastCapturedFrame"] = frameObj;

                    ThreadPool.QueueUserWorkItem(delegate
                    {
                        try { HttpPostJson(baseUrl + "/api/mayhem/state", json.Serialize(body)); } catch { }
                    });

                    if (!silentBalloon && trayIcon != null)
                    {
                        trayIcon.ShowBalloonTip(1500, "Passion Mayhem Blitz", scanAction == "scan-combat" ? "Đã chụp bảng Tab / Trận đấu gửi AI phân tích..." : "Đã chụp 3 Lõi gửi AI chấm điểm...", ToolTipIcon.Info);
                    }
                }
            }
            catch { }
        }

        private void ToggleOverlays()
        {
            overlaysEnabled = !overlaysEnabled;
            if (menuToggleOverlay != null) menuToggleOverlay.Checked = overlaysEnabled;
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
            if (desktopShell != null && !desktopShell.IsDisposed)
            {
                if (isHiddenToTray || !desktopShell.Visible) ShowAppWindow();
                else HideToTray();
                return;
            }
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
            isHiddenToTray = true;
            if (desktopShell != null && !desktopShell.IsDisposed)
            {
                desktopShell.Hide();
                return;
            }
            if (appHwnd != IntPtr.Zero && NativeMethods.IsWindow(appHwnd))
            {
                NativeMethods.ShowWindow(appHwnd, NativeMethods.SW_HIDE);
            }
        }

        private void ShowAppWindow()
        {
            isHiddenToTray = false;
            if (desktopShell != null && !desktopShell.IsDisposed)
            {
                desktopShell.Show();
                if (desktopShell.WindowState == FormWindowState.Minimized) desktopShell.WindowState = FormWindowState.Normal;
                desktopShell.Activate();
                desktopShell.SyncEmbeddedBounds();
                return;
            }
            if (appHwnd == IntPtr.Zero || !NativeMethods.IsWindow(appHwnd))
            {
                appHwnd = FindMayhemWindowHandle();
                if (appHwnd == IntPtr.Zero) return;
            }
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
                shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { "Passion Mayhem — Blitz Edition" });
                if (File.Exists(iconPath)) shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconPath + ",0" });
                shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);

                if (notifyUser && trayIcon != null)
                {
                    trayIcon.ShowBalloonTip(2500, "Passion Mayhem Blitz", "Đã tạo lối tắt ngoài Desktop!", ToolTipIcon.Info);
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
                else if (id == HK_SCAN_AUGMENTS) CaptureAndUploadFrame("scan-aug");
                else if (id == HK_SCAN_COMBAT) CaptureAndUploadFrame("scan-combat");
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
            try { if (cardsOverlayForm != null && !cardsOverlayForm.IsDisposed) cardsOverlayForm.Close(); } catch { }
            try { if (hudForm != null && !hudForm.IsDisposed) hudForm.Close(); } catch { }
            try { if (desktopShell != null && !desktopShell.IsDisposed) desktopShell.Close(); } catch { }
            try
            {
                if (IsHandleCreated)
                {
                    int[] keys = new int[] { HK_TOGGLE_APP, HK_TOGGLE_OVERLAY, HK_SCAN_AUGMENTS, HK_SCAN_COMBAT };
                    for (int i = 0; i < keys.Length; i++) NativeMethods.UnregisterHotKey(Handle, keys[i]);
                }
            }
            catch { }
            try { if (trayIcon != null) { trayIcon.Visible = false; trayIcon.Dispose(); } } catch { }
            if (closeBrowserWindow && appHwnd != IntPtr.Zero && NativeMethods.IsWindow(appHwnd))
            {
                try { NativeMethods.PostMessage(appHwnd, NativeMethods.WM_CLOSE, IntPtr.Zero, IntPtr.Zero); } catch { }
            }
            if (browserProcess != null)
            {
                try { if (!browserProcess.HasExited) browserProcess.Kill(); browserProcess.Dispose(); } catch { }
            }
            if (nodeProcess != null)
            {
                try { if (!nodeProcess.HasExited) nodeProcess.Kill(); nodeProcess.Dispose(); } catch { }
            }
            if (fallbackServer != null)
            {
                try { fallbackServer.Stop(); } catch { }
                fallbackServer = null;
            }
            try { if (wakeEvent != null) wakeEvent.Close(); } catch { }
            try { Application.Exit(); } catch { }
        }
    }

    internal sealed class EmbeddedMayhemHttpServer
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
        private readonly object stateLock = new object();
        private TcpListener listener;
        private Thread acceptThread;
        private volatile bool running = false;

        private string mapMode = "pirate_60";
        private Dictionary<string, object> minimap;
        private List<Dictionary<string, object>> relicTimers;
        private Dictionary<string, object> advisorSummary;
        private Dictionary<string, object> pendingAction = null;
        private long pendingActionSeq = 0;
        private long relicEventSeq = 0;
        private Dictionary<string, object> lastRelicTrigger = null;
        private long cardClickSeq = 0;
        private Dictionary<string, object> lastCardClick = null;
        private Dictionary<string, object> lastCapturedFrame = null;
        private long capturedFrameSeq = 0;
        private bool modalOpen = false;
        private long modalEventSeq = 0;
        private string minimapThumbBase64 = "";
        private long minimapThumbSeq = 0;
        private string recommendedItemPath = "";
        private string[] nativeOcrCards = new string[] { "", "", "" };
        private long nativeOcrSeq = 0;
        private int chromeTitlebarHeight = 33;
        private long updatedAt = NowMs();

        public EmbeddedMayhemHttpServer(string appRootDir, int listenPort)
        {
            rootDir = appRootDir;
            port = listenPort;
            InitState();
            EnsureTlsConfigured();
        }

        private void InitState()
        {
            minimap = new Dictionary<string, object>();
            minimap["scale"] = 1.0;
            minimap["sizePx"] = 221;
            minimap["offsetX"] = 14;
            minimap["offsetY"] = 13;
            minimap["flipped"] = false;
            minimap["autoDetect"] = true;
            minimap["calibrateMode"] = false;
            minimap["showMinimapOverlay"] = true;
            minimap["showHudOverlay"] = true;
            minimap["autoWatchPixels"] = true;
            minimap["gameWidth"] = 1920;
            minimap["gameHeight"] = 1080;
            minimap["detectedSource"] = "default";

            relicTimers = new List<Dictionary<string, object>>();
            relicTimers.Add(MakeRelic("ally_inner", "Trụ Trong Đồng Minh", "Trong Ta", 0.386, 0.697));
            relicTimers.Add(MakeRelic("ally_outer", "Trụ Ngoài Đồng Minh", "Ngoài Ta", 0.476, 0.600));
            relicTimers.Add(MakeRelic("enemy_outer", "Trụ Ngoài Đối Phương", "Ngoài Địch", 0.600, 0.476));
            relicTimers.Add(MakeRelic("enemy_inner", "Trụ Trong Đối Phương", "Trong Địch", 0.703, 0.393));

            advisorSummary = new Dictionary<string, object>();
            advisorSummary["champName"] = "Vi";
            advisorSummary["champTier"] = "S";
            advisorSummary["bestAugment"] = "";
            advisorSummary["bestScore"] = 0;
            advisorSummary["nextItems"] = new object[0];
            advisorSummary["tacticalNote"] = "";
        }

        private static Dictionary<string, object> MakeRelic(string id, string label, string shortLabel, double nx, double ny)
        {
            Dictionary<string, object> d = new Dictionary<string, object>();
            d["id"] = id;
            d["label"] = label;
            d["short"] = shortLabel;
            d["nx"] = nx;
            d["ny"] = ny;
            d["remaining"] = 0;
            d["total"] = 60;
            d["running"] = false;
            return d;
        }

        private static long NowMs()
        {
            return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
        }

        private static JavaScriptSerializer CreateSerializer()
        {
            JavaScriptSerializer js = new JavaScriptSerializer();
            js.MaxJsonLength = 32 * 1024 * 1024;
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
                try
                {
                    RemoteCertificateValidationCallback existing = ServicePointManager.ServerCertificateValidationCallback;
                    ServicePointManager.ServerCertificateValidationCallback = delegate(object sender, X509Certificate cert, X509Chain chain, SslPolicyErrors errors)
                    {
                        HttpWebRequest req = sender as HttpWebRequest;
                        if (req != null && req.Address != null && (req.Address.Host == "127.0.0.1" || req.Address.Host == "localhost"))
                        {
                            return true;
                        }
                        if (existing != null) return existing(sender, cert, chain, errors);
                        return errors == SslPolicyErrors.None;
                    };
                }
                catch { }
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
                    if (int.TryParse(val, out cl) && cl > 0) contentLength = Math.Min(cl, 32 * 1024 * 1024);
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
                client.ReceiveTimeout = 10000;
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

                    if (req.Path == "/api/mayhem/health" && req.Method == "GET")
                    {
                        Dictionary<string, object> health = new Dictionary<string, object>();
                        health["status"] = "ok";
                        health["app"] = "passion-mayhem-desktop";
                        health["port"] = port;
                        SendJsonResponse(stream, 200, "OK", health);
                        return;
                    }

                    if (req.Path == "/api/mayhem/live-client" && req.Method == "GET")
                    {
                        SendJsonResponse(stream, 200, "OK", FetchRiotLiveClient());
                        return;
                    }

                    if (req.Path == "/api/mayhem/riot-config" && req.Method == "GET")
                    {
                        SendJsonResponse(stream, 200, "OK", ReadRiotConfig());
                        return;
                    }

                    if (req.Path == "/api/mayhem/import-item-set" && req.Method == "POST")
                    {
                        try
                        {
                            SendJsonResponse(stream, 200, "OK", ImportRecommendedItemSet(req.Body));
                        }
                        catch (Exception ex)
                        {
                            Dictionary<string, object> err = new Dictionary<string, object>();
                            err["status"] = "error";
                            err["message"] = ex.Message;
                            SendJsonResponse(stream, 400, "Bad Request", err);
                        }
                        return;
                    }

                    if (req.Path == "/api/mayhem/state" && req.Method == "GET")
                    {
                        bool includeFrame = GetQueryParam(req.Query, "includeFrame") == "1";
                        SendJsonResponse(stream, 200, "OK", BuildMayhemStateSnapshot(includeFrame));
                        return;
                    }

                    if (req.Path == "/api/mayhem/state" && req.Method == "POST")
                    {
                        try
                        {
                            SendJsonResponse(stream, 200, "OK", ApplyMayhemStatePost(req.Body));
                        }
                        catch (Exception ex)
                        {
                            Dictionary<string, object> err = new Dictionary<string, object>();
                            err["status"] = "error";
                            err["message"] = ex.Message;
                            SendJsonResponse(stream, 400, "Bad Request", err);
                        }
                        return;
                    }

                    TryServeStaticFile(stream, req.Path);
                }
            }
            catch { }
        }

        private Dictionary<string, object> BuildMayhemStateSnapshot(bool includeFrame)
        {
            lock (stateLock)
            {
                Dictionary<string, object> outObj = new Dictionary<string, object>();
                outObj["mapMode"] = mapMode;
                outObj["minimap"] = new Dictionary<string, object>(minimap);

                List<object> relicsCopy = new List<object>(relicTimers.Count);
                for (int i = 0; i < relicTimers.Count; i++)
                {
                    relicsCopy.Add(new Dictionary<string, object>(relicTimers[i]));
                }
                outObj["relicTimers"] = relicsCopy.ToArray();
                outObj["advisorSummary"] = new Dictionary<string, object>(advisorSummary);
                outObj["pendingAction"] = pendingAction != null ? new Dictionary<string, object>(pendingAction) : null;
                outObj["pendingActionSeq"] = pendingActionSeq;
                outObj["relicEventSeq"] = relicEventSeq;
                outObj["lastRelicTrigger"] = lastRelicTrigger != null ? new Dictionary<string, object>(lastRelicTrigger) : null;
                outObj["cardClickSeq"] = cardClickSeq;
                outObj["lastCardClick"] = lastCardClick != null ? new Dictionary<string, object>(lastCardClick) : null;
                outObj["capturedFrameSeq"] = capturedFrameSeq;
                outObj["modalOpen"] = modalOpen;
                outObj["modalEventSeq"] = modalEventSeq;
                outObj["minimapThumbSeq"] = minimapThumbSeq;
                outObj["minimapThumbBase64"] = minimapThumbBase64;
                outObj["recommendedItemPath"] = recommendedItemPath;
                outObj["nativeOcrCards"] = nativeOcrCards;
                outObj["nativeOcrSeq"] = nativeOcrSeq;
                outObj["chromeTitlebarHeight"] = chromeTitlebarHeight;
                outObj["updatedAt"] = updatedAt;
                if (includeFrame && lastCapturedFrame != null)
                {
                    outObj["lastCapturedFrame"] = new Dictionary<string, object>(lastCapturedFrame);
                }
                return outObj;
            }
        }

        private Dictionary<string, object> ApplyMayhemStatePost(string rawBody)
        {
            JavaScriptSerializer js = CreateSerializer();
            Dictionary<string, object> body = string.IsNullOrEmpty(rawBody)
                ? new Dictionary<string, object>()
                : js.Deserialize<Dictionary<string, object>>(rawBody);
            if (body == null) body = new Dictionary<string, object>();

            lock (stateLock)
            {
                updatedAt = NowMs();

                if (body.ContainsKey("mapMode") && body["mapMode"] is string)
                {
                    string m = (string)body["mapMode"];
                    if (m == "pirate_60" || m == "abyss_90") mapMode = m;
                }

                Dictionary<string, object> mm = body.ContainsKey("minimap") ? body["minimap"] as Dictionary<string, object> : null;
                if (mm != null)
                {
                    foreach (KeyValuePair<string, object> kv in mm) minimap[kv.Key] = kv.Value;
                }

                if (body.ContainsKey("triggerRelicIndex") && body["triggerRelicIndex"] != null)
                {
                    int idx = Convert.ToInt32(body["triggerRelicIndex"]);
                    if (idx >= 0 && idx < relicTimers.Count)
                    {
                        int reqTotal = (body.ContainsKey("total") && body["total"] != null) ? Convert.ToInt32(body["total"]) : 0;
                        if (reqTotal < 0)
                        {
                            relicTimers[idx]["remaining"] = 0;
                            relicTimers[idx]["running"] = false;
                            relicEventSeq += 1;
                            Dictionary<string, object> trig = new Dictionary<string, object>();
                            trig["seq"] = relicEventSeq;
                            trig["index"] = idx;
                            trig["id"] = relicTimers[idx]["id"];
                            trig["total"] = -1;
                            trig["ts"] = NowMs();
                            lastRelicTrigger = trig;
                        }
                        else
                        {
                            int cd = reqTotal != 0 ? reqTotal : (mapMode == "pirate_60" ? 60 : 90);
                            relicTimers[idx]["total"] = cd;
                            relicTimers[idx]["remaining"] = cd;
                            relicTimers[idx]["running"] = true;
                            relicEventSeq += 1;
                            Dictionary<string, object> trig = new Dictionary<string, object>();
                            trig["seq"] = relicEventSeq;
                            trig["index"] = idx;
                            trig["id"] = relicTimers[idx]["id"];
                            trig["total"] = cd;
                            trig["ts"] = NowMs();
                            lastRelicTrigger = trig;
                        }
                    }
                }

                IList rtArr = body.ContainsKey("relicTimers") ? body["relicTimers"] as IList : null;
                if (rtArr != null)
                {
                    List<Dictionary<string, object>> nextList = new List<Dictionary<string, object>>();
                    for (int i = 0; i < rtArr.Count; i++)
                    {
                        Dictionary<string, object> merged = i < relicTimers.Count
                            ? new Dictionary<string, object>(relicTimers[i])
                            : new Dictionary<string, object>();
                        Dictionary<string, object> item = rtArr[i] as Dictionary<string, object>;
                        if (item != null)
                        {
                            foreach (KeyValuePair<string, object> kv in item) merged[kv.Key] = kv.Value;
                        }
                        nextList.Add(merged);
                    }
                    relicTimers = nextList;
                }

                Dictionary<string, object> adv = body.ContainsKey("advisorSummary") ? body["advisorSummary"] as Dictionary<string, object> : null;
                if (adv != null)
                {
                    foreach (KeyValuePair<string, object> kv in adv) advisorSummary[kv.Key] = kv.Value;
                }

                if (body.ContainsKey("triggerAction") && body["triggerAction"] is string)
                {
                    string act = (string)body["triggerAction"];
                    if (!string.IsNullOrEmpty(act))
                    {
                        pendingActionSeq += 1;
                        Dictionary<string, object> pa = new Dictionary<string, object>();
                        pa["seq"] = pendingActionSeq;
                        pa["action"] = act;
                        pa["ts"] = NowMs();
                        pendingAction = pa;
                    }
                }

                if (body.ContainsKey("clearPendingActionSeq") && body["clearPendingActionSeq"] != null && pendingAction != null)
                {
                    long clearSeq = Convert.ToInt64(body["clearPendingActionSeq"]);
                    long curSeq = Convert.ToInt64(pendingAction["seq"]);
                    if (clearSeq > 0 && clearSeq >= curSeq) pendingAction = null;
                }

                Dictionary<string, object> frame = body.ContainsKey("lastCapturedFrame") ? body["lastCapturedFrame"] as Dictionary<string, object> : null;
                if (frame != null && frame.ContainsKey("base64") && !string.IsNullOrEmpty(Convert.ToString(frame["base64"])))
                {
                    capturedFrameSeq += 1;
                    Dictionary<string, object> saved = new Dictionary<string, object>();
                    saved["seq"] = capturedFrameSeq;
                    saved["base64"] = Convert.ToString(frame["base64"]);
                    saved["mimeType"] = frame.ContainsKey("mimeType") && frame["mimeType"] != null ? Convert.ToString(frame["mimeType"]) : "image/jpeg";
                    saved["action"] = frame.ContainsKey("action") && frame["action"] != null ? Convert.ToString(frame["action"]) : "scan-aug";
                    saved["silent"] = frame.ContainsKey("silent") && frame["silent"] != null && Convert.ToBoolean(frame["silent"]);
                    saved["ts"] = NowMs();
                    lastCapturedFrame = saved;
                }

                if (body.ContainsKey("modalOpen") && body["modalOpen"] != null)
                {
                    bool nextOpen = Convert.ToBoolean(body["modalOpen"]);
                    if (nextOpen != modalOpen)
                    {
                        modalOpen = nextOpen;
                        modalEventSeq += 1;
                    }
                }

                if (body.ContainsKey("minimapThumbBase64") && body["minimapThumbBase64"] is string)
                {
                    string thumbStr = (string)body["minimapThumbBase64"];
                    if (!string.IsNullOrEmpty(thumbStr))
                    {
                        minimapThumbBase64 = thumbStr;
                        minimapThumbSeq += 1;
                    }
                }

                if (body.ContainsKey("chromeTitlebarHeight") && body["chromeTitlebarHeight"] != null)
                {
                    int th = Convert.ToInt32(body["chromeTitlebarHeight"]);
                    if (th >= 0 && th <= 80) chromeTitlebarHeight = th;
                }

                IList ocrArr = body.ContainsKey("nativeOcrCards") ? body["nativeOcrCards"] as IList : null;
                if (ocrArr != null && ocrArr.Count >= 3)
                {
                    nativeOcrCards = new string[]
                    {
                        Convert.ToString(ocrArr[0] ?? ""),
                        Convert.ToString(ocrArr[1] ?? ""),
                        Convert.ToString(ocrArr[2] ?? "")
                    };
                    nativeOcrSeq += 1;
                }

                Dictionary<string, object> clk = body.ContainsKey("lastCardClick") ? body["lastCardClick"] as Dictionary<string, object> : null;
                if (clk != null && clk.ContainsKey("index") && clk["index"] != null)
                {
                    cardClickSeq += 1;
                    Dictionary<string, object> savedClk = new Dictionary<string, object>();
                    savedClk["seq"] = cardClickSeq;
                    savedClk["index"] = Convert.ToInt32(clk["index"]);
                    savedClk["ts"] = NowMs();
                    lastCardClick = savedClk;
                }

                Dictionary<string, object> resp = new Dictionary<string, object>();
                resp["status"] = "ok";
                resp["pendingActionSeq"] = pendingActionSeq;
                resp["cardClickSeq"] = cardClickSeq;
                resp["capturedFrameSeq"] = capturedFrameSeq;
                resp["modalOpen"] = modalOpen;
                resp["modalEventSeq"] = modalEventSeq;
                resp["nativeOcrSeq"] = nativeOcrSeq;
                resp["minimapThumbSeq"] = minimapThumbSeq;
                resp["minimap"] = new Dictionary<string, object>(minimap);
                return resp;
            }
        }

        private List<string> DiscoverLeagueRootDirs()
        {
            List<string> roots = new List<string>();
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            List<string> cfgDirs = DiscoverLeagueConfigDirs();
            for (int i = 0; i < cfgDirs.Count; i++)
            {
                try
                {
                    DirectoryInfo p = Directory.GetParent(cfgDirs[i]);
                    if (p != null && Directory.Exists(p.FullName) && seen.Add(p.FullName)) roots.Add(p.FullName);
                }
                catch { }
            }
            return roots;
        }

        private static string ReadTextShared(string filePath)
        {
            using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
            using (StreamReader sr = new StreamReader(fs, Encoding.UTF8))
            {
                return sr.ReadToEnd();
            }
        }

        private static string HttpGetBasicAuth(string url, string password, int timeoutMs)
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "GET";
            req.Proxy = null;
            req.Timeout = timeoutMs;
            req.ReadWriteTimeout = timeoutMs;
            string token = Convert.ToBase64String(Encoding.ASCII.GetBytes("riot:" + password));
            req.Headers[HttpRequestHeader.Authorization] = "Basic " + token;
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
            {
                return sr.ReadToEnd();
            }
        }

        private Dictionary<string, object> TryReadLcuSession(out string gameflowPhase)
        {
            gameflowPhase = "";
            List<string> roots = DiscoverLeagueRootDirs();
            for (int i = 0; i < roots.Count; i++)
            {
                string lockPath = Path.Combine(roots[i], "lockfile");
                if (!File.Exists(lockPath)) continue;
                try
                {
                    string rawLock = ReadTextShared(lockPath).Trim();
                    string[] parts = rawLock.Split(':');
                    if (parts.Length < 4) continue;
                    string lcuPort = parts[2].Trim();
                    string lcuPass = parts[3].Trim();
                    string proto = parts.Length >= 5 && !string.IsNullOrEmpty(parts[4].Trim()) ? parts[4].Trim() : "https";
                    string baseUri = proto + "://127.0.0.1:" + lcuPort;

                    JavaScriptSerializer js = CreateSerializer();
                    string phaseRaw = HttpGetBasicAuth(baseUri + "/lol-gameflow/v1/gameflow-phase", lcuPass, 900);
                    gameflowPhase = (phaseRaw ?? "").Trim().Trim('"');

                    if (gameflowPhase == "ChampSelect")
                    {
                        string csRaw = HttpGetBasicAuth(baseUri + "/lol-champ-select/v1/session", lcuPass, 900);
                        Dictionary<string, object> cs = js.Deserialize<Dictionary<string, object>>(csRaw);
                        if (cs != null)
                        {
                            long localCellId = cs.ContainsKey("localPlayerCellId") && cs["localPlayerCellId"] != null ? Convert.ToInt64(cs["localPlayerCellId"]) : -1;
                            int chosenChampId = 0;
                            List<int> myTeamChamps = new List<int>();
                            IList myTeam = cs.ContainsKey("myTeam") ? cs["myTeam"] as IList : null;
                            if (myTeam != null)
                            {
                                for (int t = 0; t < myTeam.Count; t++)
                                {
                                    Dictionary<string, object> tm = myTeam[t] as Dictionary<string, object>;
                                    if (tm == null) continue;
                                    int cid = tm.ContainsKey("championId") && tm["championId"] != null ? Convert.ToInt32(tm["championId"]) : 0;
                                    int cintent = tm.ContainsKey("championPickIntent") && tm["championPickIntent"] != null ? Convert.ToInt32(tm["championPickIntent"]) : 0;
                                    int effectiveId = cid > 0 ? cid : cintent;
                                    if (effectiveId > 0) myTeamChamps.Add(effectiveId);
                                    long cellId = tm.ContainsKey("cellId") && tm["cellId"] != null ? Convert.ToInt64(tm["cellId"]) : -99;
                                    if (cellId == localCellId) chosenChampId = effectiveId;
                                }
                            }

                            List<int> benchChamps = new List<int>();
                            IList benchRaw = cs.ContainsKey("benchChampions") ? cs["benchChampions"] as IList : null;
                            if (benchRaw != null)
                            {
                                for (int b = 0; b < benchRaw.Count; b++)
                                {
                                    Dictionary<string, object> bc = benchRaw[b] as Dictionary<string, object>;
                                    if (bc != null && bc.ContainsKey("championId") && bc["championId"] != null)
                                    {
                                        int bcId = Convert.ToInt32(bc["championId"]);
                                        if (bcId > 0) benchChamps.Add(bcId);
                                    }
                                    else if (bc == null && benchRaw[b] != null)
                                    {
                                        int bcId = Convert.ToInt32(benchRaw[b]);
                                        if (bcId > 0) benchChamps.Add(bcId);
                                    }
                                }
                            }

                            int mapId = 12;
                            string queueMode = "ARAM";
                            try
                            {
                                string gfRaw = HttpGetBasicAuth(baseUri + "/lol-gameflow/v1/session", lcuPass, 800);
                                Dictionary<string, object> gf = js.Deserialize<Dictionary<string, object>>(gfRaw);
                                Dictionary<string, object> gd = gf != null && gf.ContainsKey("gameData") ? gf["gameData"] as Dictionary<string, object> : null;
                                Dictionary<string, object> q = gd != null && gd.ContainsKey("queue") ? gd["queue"] as Dictionary<string, object> : null;
                                if (q != null && q.ContainsKey("mapId") && q["mapId"] != null) mapId = Convert.ToInt32(q["mapId"]);
                                if (q != null && q.ContainsKey("gameMode") && q["gameMode"] != null) queueMode = Convert.ToString(q["gameMode"]);
                            }
                            catch { }

                            Dictionary<string, object> res = new Dictionary<string, object>();
                            res["connected"] = true;
                            res["phase"] = "ChampSelect";
                            res["source"] = "lcu-lockfile";
                            res["mapNumber"] = mapId;
                            res["gameMode"] = queueMode;
                            res["championId"] = chosenChampId;
                            res["myTeamChampionIds"] = myTeamChamps.ToArray();
                            res["benchChampionIds"] = benchChamps.ToArray();
                            return res;
                        }
                    }
                    else if (!string.IsNullOrEmpty(gameflowPhase) && gameflowPhase != "None")
                    {
                        Dictionary<string, object> res = new Dictionary<string, object>();
                        res["connected"] = false;
                        res["phase"] = gameflowPhase;
                        res["source"] = "lcu-lockfile";
                        return res;
                    }
                }
                catch { }
            }
            return null;
        }

        private Dictionary<string, object> TryReadLatestR3dLogRoster()
        {
            bool gameProcRunning = false;
            try { gameProcRunning = Process.GetProcessesByName("League of Legends").Length > 0; } catch { }
            if (!gameProcRunning) return null;

            List<string> roots = DiscoverLeagueRootDirs();
            FileInfo newestLog = null;
            for (int i = 0; i < roots.Count; i++)
            {
                string gameLogsDir = Path.Combine(roots[i], "Logs\\GameLogs");
                if (!Directory.Exists(gameLogsDir)) continue;
                try
                {
                    string[] subDirs = Directory.GetDirectories(gameLogsDir);
                    for (int d = 0; d < subDirs.Length; d++)
                    {
                        string[] logs = Directory.GetFiles(subDirs[d], "*_r3dlog.txt");
                        for (int f = 0; f < logs.Length; f++)
                        {
                            FileInfo fi = new FileInfo(logs[f]);
                            if (newestLog == null || fi.LastWriteTimeUtc > newestLog.LastWriteTimeUtc) newestLog = fi;
                        }
                    }
                }
                catch { }
            }

            if (newestLog == null || (DateTime.UtcNow - newestLog.LastWriteTimeUtc).TotalMinutes > 45.0) return null;
            try
            {
                string content = ReadTextShared(newestLog.FullName);
                if (content.IndexOf("GAMESTATE_ENDGAME", StringComparison.Ordinal) >= 0 ||
                    content.IndexOf("GAMESTATE_EXIT", StringComparison.Ordinal) >= 0)
                {
                    return null;
                }

                Regex rx = new Regex(@"ROST\|\s+CONNECTION READY\s+\|\s+(TeamOrder|TeamChaos)\s+\d+\)\s+'([^']+)'(\s+\*\*LOCAL\*\*)?\s+-\s+Champion\(([^)]+)\)");
                MatchCollection matches = rx.Matches(content);
                if (matches.Count == 0) return null;

                string localChamp = "";
                string localSummoner = "";
                List<object> players = new List<object>();
                for (int m = 0; m < matches.Count; m++)
                {
                    Match mt = matches[m];
                    string teamRaw = mt.Groups[1].Value;
                    string playerSum = mt.Groups[2].Value;
                    bool isLocal = !string.IsNullOrEmpty(mt.Groups[3].Value);
                    string champKey = mt.Groups[4].Value;
                    string teamNorm = teamRaw == "TeamOrder" ? "ORDER" : "CHAOS";
                    if (isLocal)
                    {
                        localChamp = champKey;
                        localSummoner = playerSum;
                    }
                    Dictionary<string, object> pObj = new Dictionary<string, object>();
                    pObj["championName"] = champKey;
                    pObj["rawChampionKey"] = champKey;
                    pObj["team"] = teamNorm;
                    pObj["level"] = 3;
                    pObj["isDead"] = false;
                    pObj["items"] = new object[0];
                    players.Add(pObj);
                }

                if (string.IsNullOrEmpty(localChamp)) return null;
                Dictionary<string, object> activeOut = new Dictionary<string, object>();
                activeOut["championName"] = localChamp;
                activeOut["rawChampionKey"] = localChamp;
                activeOut["level"] = 3;
                activeOut["currentGold"] = 1400.0;
                activeOut["summonerName"] = localSummoner;

                Dictionary<string, object> res = new Dictionary<string, object>();
                res["connected"] = true;
                res["phase"] = "LoadingScreen";
                res["source"] = "r3dlog";
                res["gameTime"] = 0.0;
                res["activePlayer"] = activeOut;
                res["allPlayers"] = players.ToArray();
                return res;
            }
            catch { return null; }
        }

        private Dictionary<string, object> ImportRecommendedItemSet(string rawBody)
        {
            JavaScriptSerializer js = CreateSerializer();
            Dictionary<string, object> body = string.IsNullOrEmpty(rawBody)
                ? new Dictionary<string, object>()
                : js.Deserialize<Dictionary<string, object>>(rawBody);
            if (body == null) throw new Exception("Empty item set payload");

            List<string> cfgDirs = DiscoverLeagueConfigDirs();
            string targetCfg = cfgDirs.Count > 0 ? cfgDirs[0] : "";
            if (string.IsNullOrEmpty(targetCfg)) throw new Exception("Không tìm thấy thư mục Config của LMHT");

            string recDir = Path.Combine(targetCfg, "Global\\Recommended");
            Directory.CreateDirectory(recDir);
            string outPath = Path.Combine(recDir, "!!!passion-mayhem.json");

            string champKey = body.ContainsKey("championKey") && body["championKey"] != null ? Convert.ToString(body["championKey"]) : "any";
            string title = body.ContainsKey("title") && body["title"] != null ? Convert.ToString(body["title"]) : ("Passion Mayhem: " + champKey);
            IList blocksIn = body.ContainsKey("blocks") ? body["blocks"] as IList : null;

            List<object> blocksOut = new List<object>();
            if (blocksIn != null)
            {
                for (int bi = 0; bi < blocksIn.Count; bi++)
                {
                    Dictionary<string, object> blk = blocksIn[bi] as Dictionary<string, object>;
                    if (blk == null) continue;
                    string blkTitle = blk.ContainsKey("type") && blk["type"] != null ? Convert.ToString(blk["type"]) : "Gợi Ý Trang Bị";
                    IList itemsIn = blk.ContainsKey("items") ? blk["items"] as IList : null;
                    List<object> itemsOut = new List<object>();
                    if (itemsIn != null)
                    {
                        for (int ii = 0; ii < itemsIn.Count; ii++)
                        {
                            Dictionary<string, object> it = itemsIn[ii] as Dictionary<string, object>;
                            string itemId = it != null && it.ContainsKey("id") ? Convert.ToString(it["id"]) : Convert.ToString(itemsIn[ii]);
                            itemId = (itemId ?? "").Trim();
                            if (!Regex.IsMatch(itemId, @"^\d+$")) continue;
                            Dictionary<string, object> itEntry = new Dictionary<string, object>();
                            itEntry["id"] = itemId;
                            itEntry["count"] = 1;
                            itemsOut.Add(itEntry);
                        }
                    }
                    if (itemsOut.Count > 0)
                    {
                        Dictionary<string, object> bObj = new Dictionary<string, object>();
                        bObj["recMath"] = false;
                        bObj["minSummonerLevel"] = -1;
                        bObj["maxSummonerLevel"] = -1;
                        bObj["showIfSummonerSpell"] = "";
                        bObj["hideIfSummonerSpell"] = "";
                        bObj["type"] = blkTitle;
                        bObj["items"] = itemsOut.ToArray();
                        blocksOut.Add(bObj);
                    }
                }
            }

            Dictionary<string, object> itemSetDoc = new Dictionary<string, object>();
            itemSetDoc["title"] = title;
            itemSetDoc["championKey"] = champKey;
            itemSetDoc["map"] = "any";
            itemSetDoc["mode"] = "any";
            itemSetDoc["type"] = "custom";
            itemSetDoc["priority"] = true;
            itemSetDoc["sortrank"] = 1000000001;
            itemSetDoc["blocks"] = blocksOut.ToArray();

            File.WriteAllText(outPath, js.Serialize(itemSetDoc), new UTF8Encoding(false));
            lock (stateLock) { recommendedItemPath = outPath; }

            Dictionary<string, object> ok = new Dictionary<string, object>();
            ok["status"] = "ok";
            ok["path"] = outPath;
            ok["championKey"] = champKey;
            ok["blocksCount"] = blocksOut.Count;
            return ok;
        }

        private Dictionary<string, object> FetchRiotLiveClient()
        {
            Dictionary<string, object> fail = new Dictionary<string, object>();
            fail["connected"] = false;
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("https://127.0.0.1:2999/liveclientdata/allgamedata");
                req.Method = "GET";
                req.Proxy = null;
                req.Timeout = 1000;
                req.ReadWriteTimeout = 1000;

                string raw;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                {
                    raw = sr.ReadToEnd();
                }

                JavaScriptSerializer js = CreateSerializer();
                Dictionary<string, object> data = js.Deserialize<Dictionary<string, object>>(raw);
                Dictionary<string, object> gameData = data != null && data.ContainsKey("gameData") ? data["gameData"] as Dictionary<string, object> : null;
                Dictionary<string, object> active = data != null && data.ContainsKey("activePlayer") ? data["activePlayer"] as Dictionary<string, object> : null;
                IList allPlayersRaw = data != null && data.ContainsKey("allPlayers") ? data["allPlayers"] as IList : null;

                string activeSummoner = active != null && active.ContainsKey("summonerName") && active["summonerName"] != null ? Convert.ToString(active["summonerName"]) : "";
                string activeRiotId = active != null && active.ContainsKey("riotId") && active["riotId"] != null ? Convert.ToString(active["riotId"]) : "";
                string activeChamp = "";
                string activeRawKey = "";
                object[] activeItems = new object[0];
                Dictionary<string, object> activeScores = null;

                List<object> playersOut = new List<object>();
                if (allPlayersRaw != null)
                {
                    for (int i = 0; i < allPlayersRaw.Count; i++)
                    {
                        Dictionary<string, object> p = allPlayersRaw[i] as Dictionary<string, object>;
                        if (p == null) continue;
                        string pChamp = p.ContainsKey("championName") && p["championName"] != null ? Convert.ToString(p["championName"]) : "";
                        string pRawChamp = p.ContainsKey("rawChampionName") && p["rawChampionName"] != null ? Convert.ToString(p["rawChampionName"]) : "";
                        string pRawKey = pRawChamp.Replace("game_character_displayname_", "");
                        string pSum = p.ContainsKey("summonerName") && p["summonerName"] != null ? Convert.ToString(p["summonerName"]) : "";
                        string pRiot = p.ContainsKey("riotId") && p["riotId"] != null ? Convert.ToString(p["riotId"]) : "";

                        List<object> itemsOut = new List<object>();
                        IList pItems = p.ContainsKey("items") ? p["items"] as IList : null;
                        if (pItems != null)
                        {
                            for (int j = 0; j < pItems.Count; j++)
                            {
                                Dictionary<string, object> it = pItems[j] as Dictionary<string, object>;
                                if (it == null) continue;
                                Dictionary<string, object> itObj = new Dictionary<string, object>();
                                itObj["itemID"] = it.ContainsKey("itemID") ? it["itemID"] : 0;
                                itObj["displayName"] = it.ContainsKey("displayName") ? it["displayName"] : "";
                                itemsOut.Add(itObj);
                            }
                        }

                        if (active != null && active.ContainsKey("championStats") && ((pSum == activeSummoner && !string.IsNullOrEmpty(pSum)) || (pRiot == activeRiotId && !string.IsNullOrEmpty(pRiot))))
                        {
                            activeChamp = pChamp;
                            activeRawKey = pRawKey;
                            activeItems = itemsOut.ToArray();
                            activeScores = p.ContainsKey("scores") ? p["scores"] as Dictionary<string, object> : null;
                        }

                        Dictionary<string, object> pObj = new Dictionary<string, object>();
                        pObj["championName"] = pChamp;
                        pObj["rawChampionKey"] = pRawKey;
                        pObj["team"] = p.ContainsKey("team") && p["team"] != null ? Convert.ToString(p["team"]) : "";
                        pObj["level"] = p.ContainsKey("level") && p["level"] != null ? Convert.ToInt32(p["level"]) : 1;
                        pObj["isDead"] = p.ContainsKey("isDead") && p["isDead"] != null && Convert.ToBoolean(p["isDead"]);
                        pObj["items"] = itemsOut.ToArray();
                        if (p.ContainsKey("scores") && p["scores"] != null) pObj["scores"] = p["scores"];
                        playersOut.Add(pObj);
                    }
                }

                Dictionary<string, object> activeOut = new Dictionary<string, object>();
                activeOut["championName"] = activeChamp;
                activeOut["rawChampionKey"] = activeRawKey;
                activeOut["level"] = active != null && active.ContainsKey("level") && active["level"] != null ? Convert.ToInt32(active["level"]) : 1;
                activeOut["currentGold"] = active != null && active.ContainsKey("currentGold") && active["currentGold"] != null ? Convert.ToDouble(active["currentGold"]) : 0.0;
                activeOut["summonerName"] = !string.IsNullOrEmpty(activeSummoner) ? activeSummoner : activeRiotId;
                activeOut["items"] = activeItems;
                if (active != null && active.ContainsKey("championStats") && active["championStats"] != null) activeOut["stats"] = active["championStats"];
                if (activeScores != null) activeOut["scores"] = activeScores;

                Dictionary<string, object> resObj = new Dictionary<string, object>();
                resObj["connected"] = true;
                resObj["phase"] = "InGame";
                resObj["source"] = "live-client-2999";
                resObj["gameTime"] = gameData != null && gameData.ContainsKey("gameTime") && gameData["gameTime"] != null ? Convert.ToDouble(gameData["gameTime"]) : 0.0;
                resObj["mapName"] = gameData != null && gameData.ContainsKey("mapName") && gameData["mapName"] != null ? Convert.ToString(gameData["mapName"]) : "";
                resObj["mapNumber"] = gameData != null && gameData.ContainsKey("mapNumber") && gameData["mapNumber"] != null ? Convert.ToInt32(gameData["mapNumber"]) : 0;
                resObj["mapTerrain"] = gameData != null && gameData.ContainsKey("mapTerrain") && gameData["mapTerrain"] != null ? Convert.ToString(gameData["mapTerrain"]) : "";
                resObj["gameMode"] = gameData != null && gameData.ContainsKey("gameMode") && gameData["gameMode"] != null ? Convert.ToString(gameData["gameMode"]) : "";
                resObj["activePlayer"] = activeOut;
                resObj["allPlayers"] = playersOut.ToArray();
                return resObj;
            }
            catch (Exception ex)
            {
                string lcuPhase;
                Dictionary<string, object> lcuRes = TryReadLcuSession(out lcuPhase);
                if (lcuRes != null && lcuRes.ContainsKey("connected") && Convert.ToBoolean(lcuRes["connected"]))
                {
                    return lcuRes;
                }
                Dictionary<string, object> r3dRes = TryReadLatestR3dLogRoster();
                if (r3dRes != null)
                {
                    return r3dRes;
                }
                if (lcuRes != null && lcuRes.ContainsKey("phase"))
                {
                    fail["phase"] = lcuRes["phase"];
                    fail["source"] = "lcu-lockfile";
                }
                fail["reason"] = ex.Message;
                return fail;
            }
        }

        private List<string> DiscoverLeagueConfigDirs()
        {
            List<string> dirs = new List<string>();
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            string[] procNames = new string[] { "League of Legends", "LeagueClientUx", "LeagueClient" };
            for (int i = 0; i < procNames.Length; i++)
            {
                try
                {
                    Process[] procs = Process.GetProcessesByName(procNames[i]);
                    for (int j = 0; j < procs.Length; j++)
                    {
                        try
                        {
                            string exePath = procs[j].MainModule.FileName;
                            string dir = Path.GetDirectoryName(exePath);
                            while (!string.IsNullOrEmpty(dir))
                            {
                                string cfgDir = Path.Combine(dir, "Config");
                                if (Directory.Exists(cfgDir) && (File.Exists(Path.Combine(cfgDir, "game.cfg")) || File.Exists(Path.Combine(cfgDir, "PersistedSettings.json"))))
                                {
                                    if (seen.Add(cfgDir)) dirs.Add(cfgDir);
                                    break;
                                }
                                DirectoryInfo parent = Directory.GetParent(dir);
                                dir = parent != null ? parent.FullName : null;
                            }
                        }
                        catch { }
                        finally { try { procs[j].Dispose(); } catch { } }
                    }
                }
                catch { }
            }

            string[] drives = new string[] { "C:", "D:", "E:", "F:", "G:" };
            string[] subPaths = new string[]
            {
                "\\Riot Games\\League of Legends\\Config",
                "\\Games\\Riot Games\\League of Legends\\Config"
            };
            for (int d = 0; d < drives.Length; d++)
            {
                for (int sp = 0; sp < subPaths.Length; sp++)
                {
                    string candidate = drives[d] + subPaths[sp];
                    try
                    {
                        if (Directory.Exists(candidate) && seen.Add(candidate)) dirs.Add(candidate);
                    }
                    catch { }
                }
            }
            return dirs;
        }

        private Dictionary<string, object> ReadRiotConfig()
        {
            bool found = false;
            string foundPath = "";
            double minimapScale = 1.0;
            double hudScale = 1.0;
            bool flipMiniMap = false;
            int width = 1920;
            int height = 1080;

            List<string> cfgDirs = DiscoverLeagueConfigDirs();
            string bestCfgDir = null;
            for (int i = 0; i < cfgDirs.Count; i++)
            {
                if (File.Exists(Path.Combine(cfgDirs[i], "PersistedSettings.json")) || File.Exists(Path.Combine(cfgDirs[i], "game.cfg")))
                {
                    bestCfgDir = cfgDirs[i];
                    break;
                }
            }

            if (!string.IsNullOrEmpty(bestCfgDir))
            {
                string persistedPath = Path.Combine(bestCfgDir, "PersistedSettings.json");
                string gameCfgPath = Path.Combine(bestCfgDir, "game.cfg");
                DateTime persistedMtime = File.Exists(persistedPath) ? File.GetLastWriteTimeUtc(persistedPath) : DateTime.MinValue;
                DateTime gameCfgMtime = File.Exists(gameCfgPath) ? File.GetLastWriteTimeUtc(gameCfgPath) : DateTime.MinValue;

                double persistedScale = -1;
                bool persistedHasScale = false;
                bool persistedFlip = false;
                bool persistedHasFlip = false;

                if (File.Exists(persistedPath))
                {
                    try
                    {
                        JavaScriptSerializer js = CreateSerializer();
                        string raw = File.ReadAllText(persistedPath, Encoding.UTF8);
                        Dictionary<string, object> parsed = js.Deserialize<Dictionary<string, object>>(raw);
                        found = true;
                        foundPath = persistedPath;
                        IList files = parsed != null && parsed.ContainsKey("files") ? parsed["files"] as IList : null;
                        if (files != null)
                        {
                            for (int fi = 0; fi < files.Count; fi++)
                            {
                                Dictionary<string, object> fileEntry = files[fi] as Dictionary<string, object>;
                                IList secs = fileEntry != null && fileEntry.ContainsKey("sections") ? fileEntry["sections"] as IList : null;
                                if (secs == null) continue;
                                for (int si = 0; si < secs.Count; si++)
                                {
                                    Dictionary<string, object> sec = secs[si] as Dictionary<string, object>;
                                    IList settings = sec != null && sec.ContainsKey("settings") ? sec["settings"] as IList : null;
                                    if (settings == null) continue;
                                    for (int i = 0; i < settings.Count; i++)
                                    {
                                        Dictionary<string, object> st = settings[i] as Dictionary<string, object>;
                                        if (st == null || !st.ContainsKey("name") || !st.ContainsKey("value")) continue;
                                        string n = Convert.ToString(st["name"]);
                                        string v = Convert.ToString(st["value"]);
                                        double dv;
                                        if (n == "MinimapScale" && double.TryParse(v, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out dv) && dv >= 0.1 && dv <= 4.0)
                                        {
                                            persistedScale = dv;
                                            persistedHasScale = true;
                                        }
                                        else if ((n == "GlobalScale" || n == "HUDScale") && double.TryParse(v, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out dv) && dv >= 0.05 && dv <= 4.0)
                                        {
                                            hudScale = dv;
                                        }
                                        else if (n == "FlipMiniMap")
                                        {
                                            persistedFlip = (v == "1" || v.Equals("true", StringComparison.OrdinalIgnoreCase));
                                            persistedHasFlip = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                }

                double gameCfgScale = -1;
                bool gameCfgHasScale = false;
                bool gameCfgFlip = false;
                bool gameCfgHasFlip = false;

                if (File.Exists(gameCfgPath))
                {
                    try
                    {
                        string cfgText = File.ReadAllText(gameCfgPath, Encoding.UTF8);
                        if (!found) { found = true; foundPath = gameCfgPath; }
                        Match wm = Regex.Match(cfgText, @"^\s*Width\s*=\s*(\d+)", RegexOptions.Multiline);
                        Match hm = Regex.Match(cfgText, @"^\s*Height\s*=\s*(\d+)", RegexOptions.Multiline);
                        Match mm = Regex.Match(cfgText, @"^\s*MinimapScale\s*=\s*([0-9.]+)", RegexOptions.Multiline);
                        Match fm = Regex.Match(cfgText, @"^\s*FlipMiniMap\s*=\s*(\d+)", RegexOptions.Multiline);
                        int iv;
                        double dv;
                        if (wm.Success && int.TryParse(wm.Groups[1].Value, out iv)) width = iv;
                        if (hm.Success && int.TryParse(hm.Groups[1].Value, out iv)) height = iv;
                        if (mm.Success && double.TryParse(mm.Groups[1].Value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out dv) && dv >= 0.1 && dv <= 4.0)
                        {
                            gameCfgScale = dv;
                            gameCfgHasScale = true;
                        }
                        if (fm.Success)
                        {
                            gameCfgFlip = fm.Groups[1].Value == "1";
                            gameCfgHasFlip = true;
                        }
                    }
                    catch { }
                }

                bool preferGameCfg = gameCfgMtime > persistedMtime;
                if (preferGameCfg && gameCfgHasScale) { minimapScale = gameCfgScale; foundPath = gameCfgPath; }
                else if (persistedHasScale) minimapScale = persistedScale;
                else if (gameCfgHasScale) minimapScale = gameCfgScale;

                if (preferGameCfg && gameCfgHasFlip) flipMiniMap = gameCfgFlip;
                else if (persistedHasFlip) flipMiniMap = persistedFlip;
                else if (gameCfgHasFlip) flipMiniMap = gameCfgFlip;
            }

            Dictionary<string, object> outCfg = new Dictionary<string, object>();
            outCfg["found"] = found;
            outCfg["path"] = foundPath;
            outCfg["minimapScale"] = minimapScale;
            outCfg["hudScale"] = hudScale;
            outCfg["flipMiniMap"] = flipMiniMap;
            outCfg["width"] = width;
            outCfg["height"] = height;
            return outCfg;
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
        private const string MUTEX_NAME = "Local\\PassionStar_Mayhem_Desktop_App_Mutex";
        private const string WAKE_EVENT_NAME = "Local\\PassionStar_Mayhem_Desktop_Wakeup_Event";

        [STAThread]
        private static void Main()
        {
            try { NativeMethods.SetProcessDPIAware(); } catch { }
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
