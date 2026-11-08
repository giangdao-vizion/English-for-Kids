# English for Kids

Ứng dụng PWA luyện nghe và học từ vựng tiếng Anh cho bé 5 tuổi.

## Cấu trúc

- `apps/web`: ứng dụng React/TypeScript cài trên iPhone.
- `packages/shared`: cấu trúc dữ liệu và schema dùng chung.
- `docs`: yêu cầu sản phẩm, mô hình dữ liệu và kế hoạch triển khai.
- `flow_project.md`: trạng thái các giai đoạn dự án.

## Phát triển

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Ứng dụng chạy mặc định tại `http://localhost:5173`.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Không lưu API key trong repository. Backend sẽ đọc Gemini key từ Google Secret Manager.