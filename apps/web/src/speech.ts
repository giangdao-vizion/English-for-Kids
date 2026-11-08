let englishVoice: SpeechSynthesisVoice | null = null
let vietnameseVoice: SpeechSynthesisVoice | null = null
let unlocked = false
let speakTimer: number | null = null
let queueTimer: number | null = null
let keepAliveTimer: number | null = null

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
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

function clearSpeakTimers(): void {
  if (speakTimer !== null) {
    window.clearTimeout(speakTimer)
    speakTimer = null
  }
  if (queueTimer !== null) {
    window.clearTimeout(queueTimer)
    queueTimer = null
  }
}

function startKeepAlive(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  if (keepAliveTimer !== null) {
    return
  }
  // iOS thường tự pause speechSynthesis khi không có tương tác.
  keepAliveTimer = window.setInterval(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    } catch {
      // ignore
    }
  }, 2500)
}

export function prepareVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  assignVoices()
  window.speechSynthesis.addEventListener('voiceschanged', assignVoices)
}

/**
 * Gọi trong cùng sự kiện chạm/click.
 * Trên iPhone phải speak thật (không chỉ utterance rỗng) để mở khóa ổn định.
 */
export function unlockSpeech(seedText = 'xin chào'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  assignVoices()
  startKeepAlive()

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
  } catch {
    // ignore
  }

  if (unlocked) {
    return
  }

  try {
    // Speak gần như im để kích hoạt audio session trong gesture hiện tại.
    const warmUp = new SpeechSynthesisUtterance(seedText)
    warmUp.volume = 0.01
    warmUp.rate = 1.1
    warmUp.lang = vietnameseVoice?.lang ?? 'vi-VN'
    if (vietnameseVoice) {
      warmUp.voice = vietnameseVoice
    }
    window.speechSynthesis.speak(warmUp)
    unlocked = true
  } catch {
    unlocked = true
  }
}

export function isSpeechUnlocked(): boolean {
  return unlocked
}

export function canAutoSpeak(): boolean {
  return unlocked
}

export type SpeakPart = {
  text: string
  lang: 'en' | 'vi'
  rate?: number
}

function buildUtterance(part: SpeakPart): SpeechSynthesisUtterance {
  assignVoices()
  const voice = part.lang === 'vi' ? vietnameseVoice : englishVoice
  const lang = part.lang === 'vi' ? 'vi-VN' : 'en-US'
  const utterance = new SpeechSynthesisUtterance(part.text)
  utterance.lang = voice?.lang ?? lang
  utterance.rate = part.rate ?? (part.lang === 'vi' ? 0.92 : 0.85)
  utterance.volume = 1
  if (voice) {
    utterance.voice = voice
  }
  return utterance
}

/** Đọc ngay — ưu tiên gọi từ click/touch. */
export function speakNow(parts: SpeakPart[] | SpeakPart): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  const list = (Array.isArray(parts) ? parts : [parts]).filter((part) =>
    part.text.trim(),
  )
  if (list.length === 0) {
    return
  }

  unlockSpeech(list[0].text)
  clearSpeakTimers()
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ignore
  }
  try {
    window.speechSynthesis.resume()
  } catch {
    // ignore
  }

  let index = 0
  const playNext = () => {
    if (index >= list.length) {
      return
    }
    const utterance = buildUtterance(list[index])
    index += 1
    utterance.onend = () => {
      queueTimer = window.setTimeout(playNext, isIOS() ? 40 : 20)
    }
    utterance.onerror = () => {
      queueTimer = window.setTimeout(playNext, 20)
    }
    window.speechSynthesis.speak(utterance)
  }

  // Trong gesture: chạy gần như ngay; ngoài gesture vẫn cố sau delay ngắn trên iOS.
  playNext()
}

export function speakEnglish(text: string, rate = 0.85): void {
  speakNow({ text, lang: 'en', rate })
}

export function speakVietnamese(text: string, rate = 0.9): void {
  speakNow({ text, lang: 'vi', rate })
}

export function speakQueue(parts: SpeakPart[]): void {
  speakNow(parts)
}

/** Tự đọc sau khi đã unlock (ví dụ sang câu tiếp theo). */
export function autoSpeak(parts: SpeakPart[] | SpeakPart): void {
  if (!unlocked) {
    return
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  startKeepAlive()
  try {
    window.speechSynthesis.resume()
  } catch {
    // ignore
  }
  clearSpeakTimers()
  // iOS hay nuốt speak ngay sau cancel; chờ một nhịp rồi đọc.
  speakTimer = window.setTimeout(
    () => {
      speakNow(parts)
    },
    isIOS() ? 180 : 60,
  )
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  clearSpeakTimers()
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ignore
  }
}

export function getSpeechSupportMessage(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  if (!('speechSynthesis' in window)) {
    return 'Máy này không hỗ trợ đọc chữ. Hãy dùng Safari trên iPhone.'
  }
  if (isIOS() && !unlocked) {
    return 'Trên iPhone: bật âm lượng, tắt Silent, rồi chạm Bắt đầu để nghe.'
  }
  return null
}
