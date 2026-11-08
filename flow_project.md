# Quy trình dự án: English for Kids

Ngày cập nhật: 08/11/2026 (UTC+7)

Tài liệu này theo dõi cách dự án được phân tích, xác nhận, thiết kế, triển khai và kiểm thử. Các yêu cầu sản phẩm chi tiết được lưu riêng tại `docs/PRODUCT_REQUIREMENTS.md`.

## 1. Mục tiêu của quy trình

- Phụ huynh chủ yếu xem và xác nhận, không phải tự viết yêu cầu kỹ thuật.
- Mỗi giai đoạn có kết quả rõ ràng trước khi chuyển bước.
- Quyết định đã xác nhận phải được ghi lại để tránh quên hoặc hiểu sai.
- Không bắt đầu lập trình khi phạm vi, luồng và quy tắc quan trọng chưa được xác nhận.
- Mọi thay đổi mới phải được đánh giá ảnh hưởng đến MVP trước khi đưa vào triển khai.

## 2. Trạng thái sử dụng

- `Đề xuất`: đang được Project Manager phân tích.
- `Chờ xác nhận`: đã có phương án nhưng phụ huynh chưa chốt.
- `Đã xác nhận`: được phép dùng làm yêu cầu chính thức.
- `Đang thực hiện`: đã bắt đầu thiết kế hoặc lập trình.
- `Đã kiểm thử`: đã kiểm tra theo tiêu chuẩn chấp nhận.
- `Hoàn thành`: đã được phụ huynh nghiệm thu.
- `Sau MVP`: đã ghi nhận nhưng chưa triển khai trong phiên bản đầu.

## 3. Quy tắc xác nhận

1. Project Manager giải thích phương án bằng ngôn ngữ đơn giản.
2. Nếu có lựa chọn quan trọng, đưa ra phương án A/B và nêu khuyến nghị.
3. Phụ huynh chỉ cần xác nhận hoặc ghi điểm muốn thay đổi.
4. Sau khi xác nhận, quyết định được cập nhật vào tài liệu dự án.
5. Không tự ý thay đổi quyết định đã xác nhận.
6. Nếu yêu cầu mới xung đột yêu cầu cũ, phải chỉ rõ xung đột trước khi cập nhật.

## 4. Các giai đoạn dự án

### Giai đoạn 1 — Xác định mục tiêu

Trạng thái: `Đã xác nhận`

Kết quả:

- Đối tượng là bé 5 tuổi.
- Phụ huynh tải hình flashcard có sẵn từ tiếng Anh.
- Hệ thống nhận diện chủ đề, tạo lộ trình học và ôn tập.
- Trải nghiệm ưu tiên ít thao tác, nghe và phản xạ tiếng Anh.

### Giai đoạn 2 — Xác định luồng sử dụng

Trạng thái: `Đã xác nhận`

Kết quả:

- Luồng thêm flashcard và xác nhận.
- Luồng bé học, ôn tập và nhận sao.
- Luồng phụ huynh chọn chủ đề.
- Luồng bé đề nghị đổi quà và phụ huynh duyệt.

### Giai đoạn 3 — Thiết kế danh sách màn hình

Trạng thái: `Đã xác nhận`

Kết quả:

- Rút gọn còn 10 màn hình chính.
- Không đăng nhập hoặc PIN trong MVP.
- Khu vực phụ huynh mở bằng thao tác giữ icon nhỏ.
- Kho quà chỉ hiển thị bằng icon nhỏ trên trang chính.

### Giai đoạn 4 — Xác định phạm vi MVP

Trạng thái: `Đã xác nhận`

Kết quả:

- Thiết bị mục tiêu: iPhone 14 Pro Max chạy iOS 17.
- Một hồ sơ bé và dữ liệu lưu trên thiết bị.
- Đầu vào JPG/PNG, tối đa 20 flashcard mỗi lần.
- Chưa làm đồng bộ nhiều thiết bị, chấm phát âm hoặc video nghe hiểu.

### Giai đoạn 5 — Wireframe

Trạng thái: `Đang thực hiện`

Kết quả hiện tại:

- Đã có wireframe tương tác cho 10 màn hình.
- Đã có mẫu chi tiết cho tám dạng bài ban đầu.
- Đã có mẫu cho năm dạng bài nghe bổ sung.

Việc còn lại:

- Cập nhật theo phản hồi trong quá trình xác nhận.
- Nghiệm thu mẫu trực quan trước khi hoàn thiện giao diện thật.

### Giai đoạn 6 — Thư viện bài tập

Trạng thái: `Đã xác nhận`

Kết quả:

- MVP có 13 dạng bài hoặc trạng thái bài.
- Mỗi chủ đề chỉ chọn các bài phù hợp, không dùng cả 13 dạng trong một lượt.
- Ưu tiên nghe, phản xạ và nhận diện mặt chữ.
- Dạng bài mới được thiết kế theo mô-đun và mở rộng sau MVP.

### Giai đoạn 7 — Logic học và ôn tập

Trạng thái: `Đã xác nhận`

Kết quả:

- Bao phủ 100% từ trong chủ đề.
- Chia chặng khoảng năm từ nhưng không bỏ sót từ.
- Có trạng thái `Mới`, `Đang học`, `Cần ôn`, `Đã nhớ`.
- Ôn sau 1, 3, 7, 30 ngày và thử thách theo quý.
- Không phạt khi trả lời sai.

### Giai đoạn 8 — Phân tích flashcard bằng AI

Trạng thái: `Đã xác nhận`

Kết quả:

- Một bộ ảnh tương ứng một lần gọi AI.
- Lưu gói dữ liệu dùng chung sau khi phụ huynh xác nhận.
- Tạo bài và chấm điểm bằng quy tắc có sẵn, không gọi lại AI.
- Chỉ phân tích lại khi phụ huynh chủ động yêu cầu.

### Giai đoạn 9 — Kiến trúc kỹ thuật

Trạng thái: `Đang thực hiện`

Đã thiết lập:

- Project Google Cloud riêng: `english-for-kids-20261108`.
- Firebase Hosting cho PWA.
- Cloud Run cho backend.
- Secret Manager cho Gemini API key.
- Runtime service account riêng.
- Budget cảnh báo 25.000 VND/tháng.

Nội dung còn cần hoàn thành:

- Chốt cách lưu dữ liệu và sao lưu trên iPhone.
- Chốt cách phát giọng Anh–Mỹ và tiếng Việt.
- Chốt chi tiết hoạt động khi mất Internet.
- Xây và triển khai backend với `min instances = 0`, `max instances = 1`.
- Xây và triển khai PWA.

Chi tiết hạ tầng được lưu tại `docs/GOOGLE_CLOUD_SETUP.md`.

### Giai đoạn 10 — Mô hình dữ liệu và hợp đồng API

Trạng thái: `Đã xác nhận`

Kết quả:

- Cấu trúc dữ liệu chủ đề, flashcard, bài tập và tiến độ.
- Định dạng dữ liệu AI phải trả về.
- Quy tắc kiểm tra confidence, dữ liệu không hợp lệ và xử lý lỗi.
- Vòng đời ảnh gốc, ảnh tối ưu và thumbnail.
- Cơ chế `schemaVersion` để nâng cấp dữ liệu.
- Quy tắc sao lưu và khôi phục.

Chi tiết được lưu tại `docs/DATA_MODEL.md`.

### Giai đoạn 11 — Lập kế hoạch triển khai

Trạng thái: `Đã xác nhận`

Kết quả:

- Chia công việc thành các phần nhỏ.
- Xác định thứ tự triển khai.
- Tiêu chuẩn hoàn thành cho từng phần.
- Danh sách kiểm thử tương ứng.

Chi tiết được lưu tại `docs/IMPLEMENTATION_PLAN.md`.

### Giai đoạn 12 — Xây dựng MVP

Trạng thái: `Đang thực hiện — Giai đoạn 4: khu vực phụ huynh + thêm flashcard`

Thứ tự dự kiến:

1. Khung ứng dụng và lưu dữ liệu.
2. Khu vực phụ huynh và nhập flashcard.
3. Phân tích AI một lần.
4. Màn hình học và thư viện bài tập.
5. Tiến độ, ôn tập và sao.
6. Kho quà.
7. Hoạt động ngoại tuyến và xử lý lỗi.

Kết quả Giai đoạn 1:

- Đã tạo workspace React và TypeScript.
- Đã cấu hình PWA và service worker.
- Đã tạo IndexedDB schema phiên bản 1.
- Đã tạo cấu trúc dữ liệu dùng chung và kiểm tra phản hồi AI.
- Đã xây màn hình thiết lập hồ sơ cùng trang chính cơ sở.
- Đã kiểm tra dữ liệu hồ sơ tồn tại sau khi tải lại.
- Build, typecheck, lint, kiểm thử và kiểm tra dependency production đều đạt.
- Đã triển khai bản thử tại `https://english-for-kids-20261108.web.app`.
- Đã thêm icon PNG để cài lên màn hình chính iPhone.
- Đã dựng luồng Animals mẫu: làm quen flashcard, nghe và chọn, chấm sao, lưu tiến độ và tiếp tục bài đang dở.
- Đã mở khu vực phụ huynh (giữ 3 giây), thêm/xác nhận flashcard JPG/PNG (giả lập AI), lưu IndexedDB và giao bài cho bé học.

### Giai đoạn 13 — Kiểm thử

Trạng thái: `Chưa bắt đầu`

Các lớp kiểm thử:

- Kiểm thử quy tắc bằng dữ liệu mẫu.
- Kiểm thử luồng đầy đủ từ thêm flashcard đến học và ôn.
- Kiểm thử trực tiếp trên iPhone 14 Pro Max chạy iOS 17.
- Quan sát bé sử dụng để phát hiện thao tác khó hiểu.
- Kiểm tra không bỏ sót từ và không gọi AI ngoài bước phân tích.

### Giai đoạn 14 — Nghiệm thu và phát hành

Trạng thái: `Chưa bắt đầu`

Kết quả cần có:

- Phụ huynh xác nhận các luồng chính.
- Không còn lỗi ngăn cản việc học.
- Có hướng dẫn cài ứng dụng trên iPhone.
- Có cách xuất dữ liệu sao lưu.
- Có danh sách nâng cấp sau MVP.

## 5. Quy trình xử lý yêu cầu mới

1. Ghi nhận mục tiêu của yêu cầu.
2. Kiểm tra trùng hoặc xung đột với yêu cầu đã xác nhận.
3. Phân loại:
   - Bắt buộc cho MVP.
   - Cải thiện nếu còn phù hợp phạm vi.
   - Đưa vào sau MVP.
4. Phân tích ảnh hưởng đến màn hình, dữ liệu, bài tập và kiểm thử.
5. Đưa ra phương án để phụ huynh xác nhận.
6. Cập nhật tài liệu sau khi xác nhận.

## 6. Quy tắc làm việc

- `docs/PRODUCT_REQUIREMENTS.md` là nguồn yêu cầu sản phẩm chính thức.
- `flow_project.md` là nguồn theo dõi quy trình và trạng thái dự án.
- Không lưu API key hoặc thông tin bí mật trong mã nguồn và tài liệu.
- Không gọi AI trong lúc bé học hoặc ôn tập.
- Mỗi thay đổi phải có tiêu chuẩn kiểm tra tương ứng.
- Ưu tiên trải nghiệm đơn giản hơn số lượng tính năng.
- Các nội dung dành cho bé phải được kiểm tra về ngôn ngữ và độ phù hợp độ tuổi.
