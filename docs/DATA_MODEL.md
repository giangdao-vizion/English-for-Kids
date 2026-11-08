# Mô hình dữ liệu MVP

Trạng thái: Đã xác nhận ở mức sản phẩm, sẵn sàng chuyển thành schema kỹ thuật  
Phiên bản: `1`  
Ngày cập nhật: 08/11/2026 (UTC+7)

## 1. Nguyên tắc chung

- Dữ liệu học tập được lưu trên iPhone bằng IndexedDB.
- ID do ứng dụng tạo, không sử dụng ID do AI đề xuất.
- Thời gian dùng chuỗi ISO 8601.
- Mọi bản ghi có `schemaVersion` để hỗ trợ nâng cấp.
- Hình ảnh được lưu dưới dạng Blob riêng, không nhúng base64 vào bản ghi JSON.
- Tiến độ học tách khỏi nội dung flashcard.
- Nội dung phụ huynh xác nhận hoặc sửa luôn ưu tiên hơn nội dung AI.
- Không lưu API key, access token hoặc thông tin thanh toán trên thiết bị.

## 2. Các kho dữ liệu trên thiết bị

IndexedDB gồm các object store:

| Store | Mục đích |
|---|---|
| `profiles` | Hồ sơ bé |
| `settings` | Cài đặt ứng dụng và giọng đọc |
| `analysisBatches` | Trạng thái các lần phân tích |
| `topics` | Chủ đề |
| `cards` | Nội dung flashcard |
| `images` | Ảnh tối ưu và thumbnail |
| `exerciseConfigs` | Bài được bật/tắt theo chủ đề |
| `wordProgress` | Tiến độ từng từ |
| `sessions` | Buổi học |
| `attempts` | Từng câu trả lời |
| `reviewQueue` | Lịch ôn |
| `rewards` | Danh sách quà |
| `redemptions` | Yêu cầu và lịch sử đổi quà |

## 3. Kiểu dữ liệu chung

```ts
type Id = string;
type IsoDateTime = string;

type VersionedRecord = {
  id: Id;
  schemaVersion: 1;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};
```

ID dùng UUID. `createdAt` không thay đổi; `updatedAt` cập nhật khi bản ghi được sửa.

## 4. Hồ sơ bé

```ts
type ChildProfile = VersionedRecord & {
  displayName: string;
  avatarImageId: Id | null;
  totalStars: number;
  lastActiveAt: IsoDateTime | null;
};
```

Ràng buộc:

- Chỉ có một hồ sơ trong MVP.
- `displayName` từ 1 đến 30 ký tự.
- `totalStars` không được âm.

## 5. Cài đặt

```ts
type AppSettings = VersionedRecord & {
  englishVoice: "en-US";
  vietnameseVoice: "vi-VN";
  speechRate: number;
  readVietnameseMeaning: boolean;
  wordsPerCheckpoint: 5;
  lastBackupAt: IsoDateTime | null;
};
```

Ràng buộc:

- `speechRate` nằm trong giới hạn an toàn được giao diện cho phép.
- `wordsPerCheckpoint` mặc định là 5 nhưng không giới hạn tổng số từ của chủ đề.

## 6. Lần phân tích

```ts
type AnalysisStatus =
  | "draft"
  | "uploading"
  | "analyzing"
  | "needs_review"
  | "confirmed"
  | "failed";

type AnalysisBatch = VersionedRecord & {
  status: AnalysisStatus;
  sourceImageIds: Id[];
  sourceImageHashes: string[];
  imageCount: number;
  aiCallCount: number;
  detectedTopicIds: Id[];
  reviewItemCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  confirmedAt: IsoDateTime | null;
};
```

Ràng buộc:

- Tối đa 20 flashcard mỗi lần phân tích.
- `aiCallCount` mặc định là 0 và chỉ tăng khi thực sự gửi yêu cầu.
- Không tự động gửi lại khi thất bại.
- Phân tích lại chỉ xảy ra sau thao tác rõ ràng của phụ huynh.

## 7. Chủ đề

```ts
type TopicCategory =
  | "animals"
  | "food_drinks"
  | "colors"
  | "numbers"
  | "shapes"
  | "body_parts"
  | "actions"
  | "emotions"
  | "positions"
  | "objects"
  | "general";

type TopicStatus = "active" | "completed" | "hidden";

type Topic = VersionedRecord & {
  analysisBatchId: Id;
  nameEnglish: string;
  nameVietnamese: string;
  category: TopicCategory;
  addedMonth: string;
  cardIds: Id[];
  status: TopicStatus;
  completedAt: IsoDateTime | null;
  lastStudiedAt: IsoDateTime | null;
  lastReviewedAt: IsoDateTime | null;
  aiConfidence: number;
  parentConfirmed: boolean;
};
```

`addedMonth` dùng dạng `YYYY-MM` và do ứng dụng tạo theo thời gian trên thiết bị.

## 8. Hình ảnh

```ts
type StoredImage = VersionedRecord & {
  kind: "optimized" | "thumbnail" | "avatar";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  byteSize: number;
  checksum: string;
  blob: Blob;
};

type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
```

`CropBox` dùng tỷ lệ từ 0 đến 1 để không phụ thuộc kích thước ảnh. Một ảnh có thể chứa nhiều flashcard.

## 9. Flashcard

```ts
type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "phrase"
  | "other";

type ReviewFlag =
  | "low_confidence"
  | "unreadable"
  | "duplicate"
  | "ambiguous_topic"
  | "invalid_sentence";

type Flashcard = VersionedRecord & {
  topicId: Id;
  sourceImageId: Id;
  optimizedImageId: Id;
  thumbnailImageId: Id;
  cropBox: CropBox | null;
  word: string;
  normalizedWord: string;
  meaningVietnamese: string;
  partOfSpeech: PartOfSpeech;
  imageDescription: string;
  tags: string[];
  exampleEnglish: string;
  exampleVietnamese: string;
  trueStatement: string;
  falseStatement: string;
  situationQuestion: string | null;
  compatibleExerciseIds: string[];
  aiConfidence: number;
  reviewFlags: ReviewFlag[];
  parentConfirmed: boolean;
  parentEdited: boolean;
};
```

Ràng buộc:

- Nội dung dưới `0.8` confidence phải có cờ `low_confidence`.
- Nếu không đọc được, để trống trường tương ứng và có cờ `unreadable`; AI không được đoán.
- Câu hỏi và ví dụ phải ngắn, đúng ngữ pháp và phù hợp trẻ 5 tuổi.
- Khi phụ huynh sửa, đặt `parentEdited = true`.

## 10. Cấu hình bài tập

```ts
type ExerciseConfig = VersionedRecord & {
  topicId: Id;
  exerciseId: string;
  enabled: boolean;
  order: number;
  source: "system_default" | "parent_override";
};
```

Ứng dụng có danh mục 13 dạng bài cố định trong MVP. Cấu hình chỉ quyết định dạng nào được dùng cho từng chủ đề.

## 11. Tiến độ từng từ

```ts
type WordState = "new" | "learning" | "needs_review" | "mastered";

type WordProgress = VersionedRecord & {
  profileId: Id;
  cardId: Id;
  state: WordState;
  totalAppearances: number;
  firstTryCorrectCount: number;
  incorrectCount: number;
  answerRevealCount: number;
  successfulSessionDates: string[];
  lastSeenAt: IsoDateTime | null;
  nextReviewAt: IsoDateTime | null;
  reviewStep: 0 | 1 | 2 | 3 | 4;
  weakExerciseIds: string[];
};
```

Quy tắc:

- `mastered` khi đúng ngay lần đầu trong ít nhất hai buổi khác nhau.
- Trả lời sai chuyển về `needs_review`.
- Lịch ôn tương ứng 1, 3, 7 và 30 ngày; sau đó tham gia thử thách quý.

## 12. Buổi học

```ts
type SessionType = "new_lesson" | "review" | "quarterly_challenge";
type SessionStatus = "in_progress" | "completed" | "abandoned";

type LearningSession = VersionedRecord & {
  profileId: Id;
  topicIds: Id[];
  type: SessionType;
  status: SessionStatus;
  selectedCardIds: Id[];
  exerciseIds: string[];
  currentCheckpoint: number;
  currentQuestionIndex: number;
  startedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  awardedStars: 0 | 1 | 2 | 3;
};
```

`currentCheckpoint` và `currentQuestionIndex` cho phép tiếp tục bài đang dở.

## 13. Câu trả lời

```ts
type AnswerAttempt = VersionedRecord & {
  sessionId: Id;
  cardId: Id;
  exerciseId: string;
  questionIndex: number;
  attemptNumber: number;
  answer: string;
  correct: boolean;
  firstTry: boolean;
  answerRevealed: boolean;
  answeredAt: IsoDateTime;
};
```

Bài luyện nói không tự chấm không tạo kết quả đúng/sai; chỉ ghi nhận đã hoàn thành hoạt động.

## 14. Hàng đợi ôn tập

```ts
type ReviewQueueItem = VersionedRecord & {
  profileId: Id;
  cardId: Id;
  dueAt: IsoDateTime;
  reason: "scheduled" | "incorrect" | "long_unseen" | "quarterly";
  priority: number;
};
```

Khi tạo bài ôn:

- 60% từ cần ôn hoặc hay sai.
- 30% từ đang học.
- 10% từ đã nhớ.

## 15. Quà và đổi quà

```ts
type Reward = VersionedRecord & {
  name: string;
  imageId: Id | null;
  starCost: number;
  stock: number | null;
  enabled: boolean;
};

type RedemptionStatus = "pending" | "approved" | "rejected" | "delivered";

type Redemption = VersionedRecord & {
  rewardId: Id;
  profileId: Id;
  starCost: number;
  status: RedemptionStatus;
  approvedAt: IsoDateTime | null;
  deliveredAt: IsoDateTime | null;
};
```

Sao chỉ bị trừ khi yêu cầu chuyển từ `pending` sang `approved`.

## 16. Hợp đồng dữ liệu AI

AI chỉ được trả về:

```ts
type AiAnalysisResponse = {
  schemaVersion: 1;
  topics: AiTopic[];
  warnings: AiWarning[];
};

type AiTopic = {
  nameEnglish: string;
  nameVietnamese: string;
  category: TopicCategory;
  confidence: number;
  recommendedExerciseIds: string[];
  cards: AiCard[];
  miniStory: AiMiniStory | null;
};

type AiCard = {
  sourceImageIndex: number;
  cropBox: CropBox | null;
  word: string | null;
  normalizedWord: string | null;
  meaningVietnamese: string | null;
  partOfSpeech: PartOfSpeech | null;
  imageDescription: string;
  tags: string[];
  exampleEnglish: string | null;
  exampleVietnamese: string | null;
  trueStatement: string | null;
  falseStatement: string | null;
  situationQuestion: string | null;
  compatibleExerciseIds: string[];
  confidence: number;
  reviewFlags: ReviewFlag[];
};

type AiMiniStory = {
  frames: Array<{
    cardIndexes: number[];
    narrationEnglish: string;
    narrationVietnamese: string;
  }>;
  comprehensionQuestions: Array<{
    promptEnglish: string;
    promptVietnamese: string;
    answerCardIndexes: number[];
  }>;
};

type AiWarning = {
  sourceImageIndex: number | null;
  code: string;
  messageVietnamese: string;
};
```

AI không được trả:

- ID nội bộ.
- Tháng thêm.
- Điểm, sao hoặc tiến độ.
- Mã lệnh, HTML hoặc Markdown.
- Dữ liệu ngoài schema.

## 17. Kiểm tra phản hồi AI

Backend thực hiện theo thứ tự:

1. Kiểm tra phản hồi là JSON hợp lệ.
2. Kiểm tra đúng `schemaVersion`.
3. Loại bỏ trường không nằm trong schema.
4. Kiểm tra enum, độ dài, số lượng và confidence.
5. Đánh dấu mục dưới 0.8 confidence.
6. Từ chối nội dung nguy hiểm hoặc không phù hợp trẻ em.
7. Không tự động gọi lại AI khi phản hồi sai.
8. Trả lỗi rõ ràng để phụ huynh chọn sửa thủ công hoặc phân tích lại.

## 18. Vòng đời hình ảnh

1. Ảnh gốc chỉ giữ trong lúc chuẩn bị và phân tích.
2. Sau khi xác nhận, tạo ảnh tối ưu và thumbnail.
3. Xóa ảnh gốc dung lượng lớn.
4. Bản sao lưu chứa ảnh tối ưu, thumbnail và dữ liệu JSON.

## 19. Sao lưu

File sao lưu phải chứa:

- `schemaVersion`.
- Ngày tạo.
- Toàn bộ bản ghi ứng dụng.
- Ảnh tối ưu và thumbnail.
- Checksum để phát hiện file lỗi.

Khôi phục phải kiểm tra phiên bản và không ghi đè dữ liệu hiện có nếu người dùng chưa xác nhận.
