# Kế hoạch triển khai MVP

Trạng thái: Đã xác nhận  
Ngày cập nhật: 08/11/2026 (UTC+7)

## Nguyên tắc triển khai

- Xây một luồng hoàn chỉnh với chủ đề Animals trước khi mở rộng.
- Kiểm tra sớm PWA, âm thanh, ảnh và IndexedDB trên iPhone 14 Pro Max chạy iOS 17.
- Phát triển giao diện nhập flashcard bằng dữ liệu AI giả lập trước khi dùng API thật.
- Một bộ ảnh chỉ gọi AI một lần; học và ôn không gọi AI.
- Mỗi giai đoạn phải có kiểm tra tự động và tiêu chuẩn hoàn thành.
- Không lưu secret trong frontend, repository hoặc log.

## Cấu trúc dự án

```text
apps/web
  Ứng dụng PWA trên iPhone

services/analyzer
  Backend Cloud Run gọi Gemini

packages/shared
  Cấu trúc dữ liệu và quy tắc dùng chung

docs
  Yêu cầu, quy trình và tài liệu kỹ thuật
```

## Giai đoạn 1 — Nền tảng kỹ thuật

- React và TypeScript.
- PWA cài từ Safari.
- Giao diện cơ sở cho iPhone 14 Pro Max.
- IndexedDB và schema phiên bản 1.
- Kiểm tra tự động.
- Dữ liệu mẫu, không cần Gemini.

Hoàn thành khi:

- Ứng dụng build và kiểm tra thành công.
- Có thể cài như PWA.
- Dữ liệu mẫu tồn tại sau khi tải lại.
- Không chứa API key.

## Giai đoạn 2 — Kiểm tra rủi ro trên iPhone

- Giọng Anh–Mỹ và tiếng Việt.
- Chọn nhiều ảnh từ Photos.
- Lưu ảnh trong IndexedDB.
- Cài PWA lên màn hình chính.
- Tiếp tục bài đang dở.

## Giai đoạn 3 — Luồng Animals hoàn chỉnh

- Thiết lập tên và hình đại diện.
- Trang chính.
- Học đủ 10 từ mẫu.
- Nghe và chọn hình.
- Chấm đúng/sai.
- Kết quả và sao.
- Tiếp tục bài đang dở.

## Giai đoạn 4 — Nhập và xác nhận flashcard

- Chọn tối đa 20 ảnh.
- Kiểm tra ảnh trùng, quá mờ hoặc quá lớn.
- Tối ưu ảnh và tạo thumbnail.
- Màn hình phân tích và xác nhận.
- Chỉnh sửa thủ công.
- Xác nhận và giao bài.

Giao diện được hoàn thiện bằng dữ liệu giả lập trước khi kết nối AI.

## Giai đoạn 5 — Backend phân tích AI

- Nhận ảnh đã nén.
- Giới hạn số ảnh và dung lượng.
- Đọc key từ Secret Manager.
- Gọi Gemini đúng một lần.
- Yêu cầu JSON theo schema.
- Kiểm tra dữ liệu và confidence.
- Không tự động gọi lại khi lỗi.
- Giới hạn số lần phân tích theo thiết bị.

## Giai đoạn 6 — Thư viện 13 dạng bài

Nhóm nghe cơ bản:

1. Nghe và đọc theo.
2. `What is this?`
3. Nghe và chọn hình.
4. Nghe rồi chọn mặt chữ.
5. Ghép âm thanh hoặc từ với hình.

Nhóm nghe hiểu:

6. Câu hỏi tình huống.
7. Yes/No.
8. Chuỗi hình có lời kể.
9. Thử thách tổng hợp.

Nhóm theo chủ đề:

10. Đếm và chọn số.
11. Nhận diện màu/hình dạng.
12. Chạm đúng vị trí.
13. Kéo và thả.

## Giai đoạn 7 — Lộ trình và tiến độ

- Chia chặng khoảng năm từ.
- Bao phủ 100% từ.
- Tiếp tục từ vị trí đang dở.
- Bốn trạng thái ghi nhớ.
- Lặp từ sai sau hai đến ba câu.
- Hoàn thành chủ đề.
- Trao tối đa ba sao.

## Giai đoạn 8 — Ôn tập

- Lịch 1, 3, 7 và 30 ngày.
- Thử thách quý.
- Tỷ lệ 60% từ yếu, 30% đang học, 10% đã nhớ.
- Chọn một hoặc nhiều chủ đề.
- Không lặp một từ liên tiếp quá nhiều.

## Giai đoạn 9 — Kho quà

- Thêm và sửa quà.
- Bé gửi yêu cầu đổi.
- Phụ huynh giữ nút để duyệt.
- Chỉ trừ sao sau khi duyệt.
- Lưu lịch sử trao quà.

## Giai đoạn 10 — Sao lưu và ngoại tuyến

- Xuất và khôi phục bản sao lưu.
- Kiểm tra checksum.
- Không ghi đè ngoài ý muốn.
- Cache ứng dụng để học khi mất mạng.
- Thông báo rõ khi phân tích cần Internet.

## Giai đoạn 11 — Hoàn thiện giao diện

- Áp dụng thiết kế 10 màn hình.
- Vùng chạm phù hợp bé 5 tuổi.
- Giảm chữ hướng dẫn.
- Phản hồi bằng âm thanh.
- Kiểm tra trên iPhone 14 Pro Max.

## Giai đoạn 12 — Kiểm thử và triển khai

- Kiểm tra quy tắc học, ôn và 13 dạng bài.
- Kiểm tra dữ liệu AI sai, ảnh lỗi và mất mạng.
- Kiểm tra đóng ứng dụng giữa bài.
- Kiểm tra không gọi AI ngoài bước phân tích.
- Triển khai backend lên Cloud Run.
- Triển khai PWA lên Firebase Hosting.
- Cloud Run dùng `min instances = 0`, `max instances = 1`.

## Định nghĩa hoàn thành

Một giai đoạn chỉ hoàn thành khi:

- Chức năng hoạt động.
- Có kiểm tra tự động phù hợp.
- Không chứa secret.
- Tài liệu được cập nhật.
- Không phá chức năng đã hoàn thành.
- Có kết quả để phụ huynh xem hoặc kiểm tra khi cần.
