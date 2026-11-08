let englishVoice: SpeechSynthesisVoice | null = null
let vietnameseVoice: SpeechSynthesisVoice | null = null

function pickVoice(
  voices: SpeechSynthesisVoice[],
  localePrefix: string,
): SpeechSynthesisVoice | null {
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(localePrefix)) ??
    voices.find((voice) =>
      voice.lang.toLowerCase().includes(localePrefix.split('-')[0]),
    ) ??
    null
  )
}

export function prepareVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  const assign = () => {
    const voices = window.speechSynthesis.getVoices()
    englishVoice = pickVoice(voices, 'en-us') ?? pickVoice(voices, 'en')
    vietnameseVoice = pickVoice(voices, 'vi')
  }

  assign()
  window.speechSynthesis.onvoiceschanged = assign
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

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = voice?.lang ?? lang
  utterance.rate = rate
  if (voice) {
    utterance.voice = voice
  }
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  window.speechSynthesis.cancel()
}
