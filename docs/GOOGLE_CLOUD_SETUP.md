# Google Cloud setup

Ngày cập nhật: 08/11/2026 (UTC+7)

Tài liệu này ghi lại cấu hình hạ tầng không chứa thông tin bí mật. Không ghi API key, access token hoặc mã xác minh vào file này.

## Project

- Tên: `English for Kids`
- Project ID: `english-for-kids-20261108`
- Project number: `600276893901`
- Billing: đã liên kết và đang hoạt động
- Cloud Run region mặc định: `us-central1`
- Firebase state: `ACTIVE`
- Firebase Hosting site: `english-for-kids-20261108`
- Firebase Hosting URL: `https://english-for-kids-20261108.web.app`

Project này được tạo riêng cho ứng dụng để không ảnh hưởng các project Google Cloud khác.

## Dịch vụ đã bật

- Cloud Run
- Secret Manager
- Cloud Build
- Artifact Registry
- Firebase Management
- Firebase Hosting
- Cloud Billing Budgets

## Kiểm soát chi phí

- Budget cảnh báo: `25.000 VND/tháng`
- Ngưỡng cảnh báo: 50%, 90% và 100%
- Budget chỉ gửi cảnh báo, không phải giới hạn chi phí cứng.
- Khi triển khai Cloud Run phải đặt `min instances = 0` và `max instances = 1`.
- Backend phải giới hạn số ảnh, dung lượng, số lần phân tích và không tự động thử lại AI.

## Bảo mật backend

- Runtime service account:
  `english-for-kids-backend@english-for-kids-20261108.iam.gserviceaccount.com`
- Secret Manager secret: `gemini-api-key`
- Service account chỉ được cấp quyền đọc secret cần thiết.
- Gemini key được giới hạn cho `generativelanguage.googleapis.com`.
- Secret đã có một phiên bản hoạt động.
- Không đưa secret vào frontend, repository, log hoặc tài liệu.

Một khóa tạm thời từng xuất hiện trong log khi cấu hình đã được xóa ngay và không được sử dụng. Khóa đang hoạt động được tạo lại và đưa thẳng vào Secret Manager mà không hiển thị giá trị.

## Trạng thái triển khai

Đã hoàn thành:

- Tạo project riêng.
- Liên kết billing.
- Kích hoạt Firebase.
- Bật các API cần thiết.
- Tạo budget cảnh báo.
- Tạo runtime service account.
- Tạo và phân quyền Secret Manager.
- Tạo khóa Gemini mới và lưu an toàn.
- Triển khai bản PWA nền tảng đầu tiên lên Firebase Hosting.
- Tạo icon PNG dành cho màn hình chính iPhone.
- Thu hồi khóa service account tạm sau mỗi lần triển khai.

Đã triển khai analyzer:

- Cloud Run service: `english-for-kids-analyzer`
- URL: `https://english-for-kids-analyzer-600276893901.us-central1.run.app`
- Region: `us-central1`
- Secret: `GEMINI_API_KEY=gemini-api-key:latest`
- Model mặc định: `gemini-flash-lite-latest`
- `min instances = 0`, `max instances = 1`
- Endpoint: `GET /health`, `POST /analyze`
- Rate limit đơn giản theo IP; CORS chỉ mở cho hosting và localhost.
