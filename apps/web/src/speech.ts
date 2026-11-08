let englishVoice: SpeechSynthesisVoice | null = null
let vietnameseVoice: SpeechSynthesisVoice | null = null
let unlocked = false
let speakTimer: number | null = null
let queueTimer: number | null = null

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  localePrefix: string,
): SpeechSynthesisVoice | null {
  const prefix = localePrefix.toLowerCase()
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    voices.find((voice) =>
      voice.lang.toLowerCase().includes(prefix.split('-')[0]),
    ) ??
    null
  )
}

function assignVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  const voices = window.speechSynthesis.getVoices()
  englishVoice = pickVoice(voices, 'en-us') ?? pickVoice(voices, 'en')
  vietnameseVoice = pickVoice(voices, 'vi')
}

export function prepareVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  assignVoices()
  window.speechSynthesis.addEventListener('voiceschanged', assignVoices)
}

/** Gọi trong sự kiện chạm/click để mở khóa TTS trên iPhone. */
export function unlockSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  assignVoices()
  if (unlocked) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
    return
  }

  try {
    const warmUp = new SpeechSynthesisUtterance('')
    warmUp.volume = 0
    warmUp.rate = 1
    warmUp.lang = 'en-US'
    window.speechSynthesis.speak(warmUp)
    unlocked = true
  } catch {
    unlocked = true
  }
}

export function isSpeechUnlocked(): boolean {
  return unlocked
}

/** Sau khi đã mở khóa (thường khi bấm Bắt đầu học), được phép tự đọc. */
export function canAutoSpeak(): boolean {
  return unlocked
}

export function speakEnglish(text: string, rate = 0.85): void {
  speak(text, englishVoice, 'en-US', rate)
}

export function speakVietnamese(text: string, rate = 0.9): void {
  speak(text, vietnameseVoice, 'vi-VN', rate)
}

type SpeakPart = {
  text: string
  lang: 'en' | 'vi'
  rate?: number
}

/** Đọc lần lượt nhiều câu (ví dụ khen tiếng Việt rồi đọc từ tiếng Anh). */
export function speakQueue(parts: SpeakPart[]): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  const usable = parts.filter((part) => part.text.trim())
  if (usable.length === 0) {
    return
  }

  stopSpeaking()
  assignVoices()

  let index = 0
  const playNext = () => {
    if (index >= usable.length) {
      return
    }
    const part = usable[index]
    index += 1
    const voice = part.lang === 'vi' ? vietnameseVoice : englishVoice
    const lang = part.lang === 'vi' ? 'vi-VN' : 'en-US'
    const utterance = new SpeechSynthesisUtterance(part.text)
    const selected = voice
    utterance.lang = selected?.lang ?? lang
    utterance.rate = part.rate ?? (part.lang === 'vi' ? 0.92 : 0.85)
    if (selected) {
      utterance.voice = selected
    }
    utterance.onend = () => {
      queueTimer = window.setTimeout(playNext, isIOS() ? 80 : 40)
    }
    utterance.onerror = () => {
      queueTimer = window.setTimeout(playNext, 40)
    }
    window.speechSynthesis.speak(utterance)
  }

  speakTimer = window.setTimeout(playNext, isIOS() ? 60 : 0)
}

function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
  lang: string,
  rate: number,
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  if (!text.trim()) {
    return
  }

  assignVoices()
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume()
  }

  if (speakTimer !== null) {
    window.clearTimeout(speakTimer)
    speakTimer = null
  }
  if (queueTimer !== null) {
    window.clearTimeout(queueTimer)
    queueTimer = null
  }

  window.speechSynthesis.cancel()

  const run = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    const selected =
      voice ?? (lang.startsWith('vi') ? vietnameseVoice : englishVoice)
    utterance.lang = selected?.lang ?? lang
    utterance.rate = rate
    if (selected) {
      utterance.voice = selected
    }
    window.speechSynthesis.speak(utterance)
  }

  speakTimer = window.setTimeout(run, isIOS() ? 60 : 0)
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  if (speakTimer !== null) {
    window.clearTimeout(speakTimer)
    speakTimer = null
  }
  if (queueTimer !== null) {
    window.clearTimeout(queueTimer)
    queueTimer = null
  }
  window.speechSynthesis.cancel()
}

export function getSpeechSupportMessage(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  if (!('speechSynthesis' in window)) {
    return 'Máy này không hỗ trợ đọc chữ. Hãy dùng Safari trên iPhone.'
  }
  if (isIOS() && !unlocked) {
    return 'Trên iPhone: bật âm lượng, tắt nút Silent, rồi bắt đầu bài để nghe.'
  }
  return null
}
