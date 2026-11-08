import type { LessonPhase } from './engine'

export type LessonIntro = {
  phase: Exclude<LessonPhase, 'result'>
  title: string
  body: string
  /** Hướng dẫn đầy đủ — lần đầu. */
  speakText: string
  /** Nhắc ngắn — các lần sau, vẫn cần chạm để iPhone phát được tiếng. */
  shortSpeak: string
}

export const LESSON_INTROS: Record<Exclude<LessonPhase, 'result'>, LessonIntro> =
  {
    flashcard: {
      phase: 'flashcard',
      title: 'Làm quen từ mới',
      body: 'Con nhìn hình, nghe từ tiếng Anh, rồi bấm Tiếp theo để sang từ khác.',
      speakText:
        'Bài làm quen từ mới. Con nhìn hình, nghe từ tiếng Anh, rồi bấm tiếp theo.',
      shortSpeak: 'Làm quen từ mới. Con nghe từ nhé.',
    },
    'listen-choose': {
      phase: 'listen-choose',
      title: 'Nghe và chọn hình',
      body: 'Con nghe từ tiếng Anh, rồi chạm vào hình đúng. Sai thì được thử lại.',
      speakText:
        'Bài nghe và chọn hình. Con nghe từ tiếng Anh, rồi chạm vào hình đúng.',
      shortSpeak: 'Nghe và chọn hình. Con nghe từ rồi chọn hình đúng.',
    },
    'choose-word': {
      phase: 'choose-word',
      title: 'Chọn từ đúng',
      body: 'Con nhìn hình, nghe từ, rồi chọn chữ tiếng Anh đúng.',
      speakText:
        'Bài chọn từ đúng. Con nhìn hình, nghe từ, rồi chọn chữ tiếng Anh đúng.',
      shortSpeak: 'Chọn từ đúng. Con nghe từ rồi chọn chữ.',
    },
    'yes-no': {
      phase: 'yes-no',
      title: 'Trả lời Yes hoặc No',
      body: 'Con nhìn hình, nghe câu hỏi, rồi chọn Yes hoặc No.',
      speakText:
        'Bài yes no. Con nhìn hình, nghe câu hỏi, rồi chọn Yes hoặc No.',
      shortSpeak: 'Yes hoặc No. Con nghe câu hỏi rồi chọn.',
    },
  }

export const FEEDBACK_VOICE = {
  correct: 'Chính xác! Giỏi lắm!',
  retry: 'Chưa đúng. Con thử lại nhé.',
  reveal: (word: string) => `Đáp án đúng là ${word}.`,
  yes: 'Đúng rồi. Yes.',
  no: 'Đúng rồi. No.',
  wrongYesNo: (answer: 'Yes' | 'No') => `Chưa đúng. Đáp án là ${answer}.`,
} as const
