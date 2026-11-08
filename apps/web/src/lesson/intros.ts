import type { LessonPhase } from './engine'

export type LessonIntro = {
  phase: Exclude<LessonPhase, 'result'>
  title: string
  body: string
  speakText: string
}

export const LESSON_INTROS: Record<Exclude<LessonPhase, 'result'>, LessonIntro> =
  {
    flashcard: {
      phase: 'flashcard',
      title: 'Làm quen từ mới',
      body: 'Con nhìn hình, nghe từ tiếng Anh, rồi bấm Tiếp theo để sang từ khác.',
      speakText:
        'Bài làm quen từ mới. Con nhìn hình, nghe từ tiếng Anh, rồi bấm tiếp theo.',
    },
    'listen-choose': {
      phase: 'listen-choose',
      title: 'Nghe và chọn hình',
      body: 'Con nghe từ tiếng Anh, rồi chạm vào hình đúng. Sai thì được thử lại.',
      speakText:
        'Bài nghe và chọn hình. Con nghe từ tiếng Anh, rồi chạm vào hình đúng.',
    },
    'choose-word': {
      phase: 'choose-word',
      title: 'Chọn từ đúng',
      body: 'Con nhìn hình, nghe từ, rồi chọn chữ tiếng Anh đúng.',
      speakText:
        'Bài chọn từ đúng. Con nhìn hình, nghe từ, rồi chọn chữ tiếng Anh đúng.',
    },
    'yes-no': {
      phase: 'yes-no',
      title: 'Trả lời Yes hoặc No',
      body: 'Con nhìn hình, nghe câu hỏi, rồi chọn Yes hoặc No.',
      speakText:
        'Bài yes no. Con nhìn hình, nghe câu hỏi, rồi chọn Yes hoặc No.',
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
