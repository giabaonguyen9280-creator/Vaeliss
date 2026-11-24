# Vaelis – Thung Lũng Xương Tàn

Game nhập vai sinh tồn theo lượt phong cách Dark Fantasy lấy bối cảnh Thung Lũng Xương Tàn và Đại Giáo Đường Goethe.

## Cài Đặt & Chạy Cục Bộ

```bash
npm install
npm run dev
```

Ứng dụng chạy mặc định tại `http://localhost:3000`.

## Kiểm Tra Mã Nguồn & Bộ Test

```bash
npm run lint
npm test
```

- `npm run lint`: Kiểm tra kiểu TypeScript (`tsc --noEmit`).
- `npm test`: Chạy bộ kiểm thử luật chơi (`tsx --test src/game/rules.test.ts`).

## Điều Khiển Bàn Phím

| Phím | Chức Năng |
| :--- | :--- |
| `WASD` / `Phím Mũi Tên` | Di chuyển trên bản đồ hầm ngục & điều hướng lựa chọn |
| `F` / `Enter` / `Space` | Tương tác (NPC, rương, thùng gỗ, xác quái, bệ thờ, cửa, tường nứt) & xác nhận |
| `1`..`6` | Chọn nhanh hành động trong giao tranh hoặc chọn mục đối thoại |
| `I` | Mở / đóng Túi Đồ, Trang Bị, Chế Tạo & Giả Kim |
| `L` | Mở / đóng Nhật Ký Ký Ức & Sổ Tay Lữ Hành |
| `ESC` | Đóng cửa sổ hiện tại / mở Menu Tạm Dừng |
