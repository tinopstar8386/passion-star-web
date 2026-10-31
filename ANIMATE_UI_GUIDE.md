# HƯỚNG DẪN TÌM HIỂU & ỨNG DỤNG ANIMATE-UI CHO CÁC DỰ ÁN

Tài liệu này tổng hợp toàn bộ kiến thức, cấu trúc và phương pháp trích xuất các hiệu ứng đỉnh cao từ repository [animate-ui](https://github.com/imskyleen/animate-ui) để áp dụng vào các dự án web thực tế (**React, Next.js, Vue, hoặc Vanilla HTML/CSS/JS**).

---

## 1. Animate-UI Là Gì? Bản Chất Kỹ Thuật

**Animate-UI** (tác giả `@imskyleen`) là bộ thư viện mã nguồn mở chuyên cung cấp các **Drop-in Primitives** có hiệu ứng chuyển động vật lý (Spring Physics) tương thích hoàn toàn với hệ sinh thái **shadcn/ui**, **Radix UI**, **Base UI** và **React Aria**.

### Điểm đặc sắc về kiến trúc:
1. **Drop-in replacement (Đổi import là chạy)**:
   Không cần viết lại JSX hay đổi cấu trúc props. Bạn chỉ cần đổi dòng import:
   ```tsx
   // Trước đây:
   import { Accordion as AccordionPrimitive } from 'radix-ui';
   // Khi dùng Animate-UI:
   import { Accordion as AccordionPrimitive } from '@animate-ui/react/primitives/radix-ui';
   ```
2. **Spring Physics & Momentum (Vật lý lò xo thay vì CSS Bezier thô cứng)**:
   Sử dụng `motion/react` (Framer Motion v11+) với các tham số vật lý:
   - `stiffness`: Độ cứng lò xo (phản hồi nhanh hay chậm).
   - `damping`: Độ giảm chấn (hãm quán tính để không bị rung lắc quá đà).
   - `mass`: Trọng lượng vật thể ảo.
3. **Canvas Physics Simulation (Mô phỏng trọng lực trên thẻ Canvas)**:
   Các hiệu ứng như `gravity-stars`, `bubbles`, `fireworks`, `hole` sử dụng HTML5 Canvas + thuật toán vector quán tính (`vx`, `vy`, `mass`, khoảng cách Euclidean) kết hợp `requestAnimationFrame` và tối ưu hiệu năng dừng vẽ khi tab bị ẩn (`usePageVisible`) hoặc ra khỏi khung nhìn màn hình (`useInView`).

---

## 2. Cấu Trúc Repository Đã Kéo Về (`animate-ui-repo`)

Repository đã được clone về tại thư mục [`animate-ui-repo`](./animate-ui-repo/):

```text
animate-ui-repo/
├── apps/
│   └── v2/
│       └── registry/               <-- NƠI CHỨA SOURCE CODE CÁC HIỆU ỨNG ĐỘNG
│           ├── backgrounds/        <-- gravity-stars, bubble, fireworks, hole, glyph, gradient
│           ├── buttons/            <-- liquid, flip, github-stars, theme-toggler
│           ├── components/         <-- page-transition, code-block
│           └── icons/              <-- Các icon SVG tương tác động theo click/hover
├── packages/
│   ├── react/src/
│   │   ├── primitives/             <-- effects (magnetic, tilt, shine), texts (sliding-number, typing)
│   │   │   ├── radix-ui/           <-- accordion, dialog, popover, tabs, tooltip, sheet...
│   │   │   ├── effects/            <-- magnetic, tilt, shine, auto-height, blur...
│   │   │   └── texts/              <-- sliding-number, typing, morphing, gradient...
│   │   └── utils/motion/           <-- Tối ưu ReducedMotion, FPS và lò xo
│   └── cli/                        <-- CLI tự động inject component (@animate-ui/cli)
```

---

## 3. Cách Áp Dụng Cho Dự Án REACT / NEXT.JS / SHADCN-UI

Nếu dự án tương lai của bạn sử dụng **React**, **Next.js** hoặc **Vite**:

### Cách 3.1: Dùng lệnh CLI (Khuyên dùng)
Tương tự như shadcn CLI, bạn có thể tự động tải component vào project:

```bash
# Nâng cấp toàn bộ component shadcn đã cài sang bản có Animation:
npx @animate-ui/cli@latest animate all

# Hoặc cài đặt từng hiệu ứng cụ thể:
npx @animate-ui/cli@latest add gravity-stars
npx @animate-ui/cli@latest add magnetic
npx @animate-ui/cli@latest add tilt
```

### Cách 3.2: Cài gói thư viện trực tiếp
```bash
npm install motion @animate-ui/react
# hoặc
pnpm add motion @animate-ui/react
```
Sau đó import và dùng:
```tsx
import { Magnetic } from '@animate-ui/react/primitives/effects/magnetic';

export default function MyButton() {
  return (
    <Magnetic strength={0.4}>
      <button className="px-6 py-3 bg-indigo-600 rounded-xl text-white font-semibold">
        Nút Tự Hút Con Trỏ Chuột
      </button>
    </Magnetic>
  );
}
```

---

## 4. Cách Áp Dụng Cho Dự Án HTML / JS THUẦN / VUE / PHP (Đã đóng gói sẵn)

Đối với các dự án không dùng Node.js/React (như hệ thống Dashboard, Landing page trong `Passion Star Code`), toàn bộ tinh hoa thuật toán của Animate-UI đã được trích xuất và đóng gói vào thư mục [`animate-kit/`](./animate-kit/):

- [`animate-kit/animate-kit.css`](./animate-kit/animate-kit.css): Chứa các animation viền neon, specular shimmer, ripple, 3D perspective.
- [`animate-kit/animate-kit.js`](./animate-kit/animate-kit.js): Chứa mô phỏng hạt sao Canvas, lực nam châm Magnetic, thẻ nghiêng 3D Tilt, nhảy số đếm mượt mà (Exponential ease-out), Typewriter.

### Bước 1: Nhúng vào file HTML
```html
<!-- Đặt trong thẻ <head> -->
<link rel="stylesheet" href="./animate-kit/animate-kit.css">

<!-- Đặt trước thẻ đóng </body> -->
<script src="./animate-kit/animate-kit.js"></script>
```

### Bước 2: Kích hoạt bằng thuộc tính `data-animate`

| Hiệu ứng | Cách viết HTML | Mô tả |
| :--- | :--- | :--- |
| **Gravity Stars Canvas** | `<div data-animate="gravity-stars" data-stars-count="90" data-gravity="attract"></div>` | Nền các ngôi sao phát sáng bay lượn, bị hút hoặc đẩy khi rê chuột |
| **Magnetic Button** | `<div data-animate="magnetic" data-magnetic-strength="0.4"><button>Click Me</button></div>` | Nút bị hút dính vào con trỏ chuột theo độ nhạy cấu hình |
| **3D Tilt Card** | `<div data-animate="tilt" data-tilt-max="14">...</div>` | Khối card nghiêng theo 3D perspective và tạo vệt sáng gương glare |
| **Liquid / Glow Border** | `<div data-animate="glow-border">...</div>` | Viền gradient xoay 360 độ liên tục tạo hiệu ứng viền neon |
| **Spring Counter** | `<span data-animate="counter" data-counter-target="15000">0</span>` | Chạy số đếm từ 0 lên 15,000 với gia tốc mượt mà |
| **Typewriter Text** | `<span data-animate="typewriter" data-words='["Câu 1", "Câu 2"]'></span>` | Gõ chữ tự động đổi câu với con trỏ nhấp nháy |
| **Specular Shimmer** | `<h1 data-animate="shimmer">Tiêu đề phát sáng</h1>` | Vệt ánh kim loại quét ngang qua chữ |
| **Ripple Click** | `<button data-animate="ripple">Bấm có sóng nước</button>` | Sóng nước lan tỏa từ tọa độ click chuột |

### Bước 3: Hoặc điều khiển bằng JavaScript linh hoạt
```javascript
// Khởi tạo nền hạt sao trên 1 canvas bất kỳ
const stars = AnimateKit.gravityStars('#myCanvas', {
  starsCount: 100,
  mouseGravity: 'attract', // hoặc 'repel'
  movementSpeed: 0.5
});

// Chuyển đổi trạng thái hút/đẩy
stars.setGravity('repel');

// Chạy hiệu ứng số nhảy bất cứ khi nào nhận dữ liệu API
AnimateKit.counter(document.getElementById('revenueText'), 9850000);
```

---

## 5. Trải Nghiệm Thử Nghiệm Trực Quan

Một trang showcase hoàn chỉnh đã được tạo sẵn tại:
👉 [**`animate-showcase.html`**](file:///z:/Passion%20Star%20Code/animate-showcase.html)

Bạn có thể mở file này trên trình duyệt để tương tác trực tiếp với các hạt sao, thử lực hút/đẩy, rê chuột lên các nút nam châm và copy code mẫu trực tiếp cho các dự án sau.
