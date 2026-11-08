let englishVoice: SpeechSynthesisVoice | null = null
let vietnameseVoice: SpeechSynthesisVoice | null = null
let unlocked = false
let speakTimer: number | null = null

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
    // iOS chỉ cho phép TTS sau thao tác người dùng trong cùng gesture.
    // Phát câu trống volume=0 để mở khóa, không cancel ngay lập tức.
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

export function canAutoSpeak(): boolean {
  return unlocked && !isIOS()
}

export function speakEnglish(text: string, rate = 0.85): void {
  speak(text, englishVoice, 'en-US', rate)
}

export function speakVietnamese(text: string, rate = 0.9): void {
  speak(text, vietnameseVoice, 'vi-VN', rate)
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

  window.speechSynthesis.cancel()

  const run = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    const selected = voice ?? (lang.startsWith('vi') ? vietnameseVoice : englishVoice)
    utterance.lang = selected?.lang ?? lang
    utterance.rate = rate
    if (selected) {
      utterance.voice = selected
    }
    window.speechSynthesis.speak(utterance)
  }

  // iOS thường nuốt speak() ngay sau cancel(); cần delay ngắn.
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
  window.speechSynthesis.cancel()
}

export function getSpeechSupportMessage(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  if (!('speechSynthesis' in window)) {
    return 'Máy này không hỗ trợ đọc chữ. Hãy dùng Safari trên iPhone.'
  }
  if (isIOS()) {
    return 'Trên iPhone: bật âm lượng, tắt nút Silent, rồi chạm nút ♪ để nghe.'
  }
  return null
}
