import http from 'node:http'
import { aiAnalysisResponseSchema, SCHEMA_VERSION } from './schema.js'

const PORT = Number(process.env.PORT || 8080)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'
const MAX_IMAGES = 20
const MAX_BODY_BYTES = 12 * 1024 * 1024
const ALLOWED_ORIGINS = new Set(
  (
    process.env.ALLOWED_ORIGINS ||
    'https://english-for-kids-20261108.web.app,http://127.0.0.1:5173,http://localhost:5173'
  ).split(','),
)

const hits = new Map()

function cors(req, res) {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function rateLimit(ip) {
  const now = Date.now()
  const windowMs = 60_000
  const maxHits = 8
  const bucket = hits.get(ip)?.filter((t) => now - t < windowMs) || []
  if (bucket.length >= maxHits) {
    return false
  }
  bucket.push(now)
  hits.set(ip, bucket)
  return true
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('Payload quá lớn.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function buildPrompt(imageCount, fileNames) {
  return `Bạn là trợ lý tạo flashcard tiếng Anh cho trẻ 5 tuổi Việt Nam.
Phân tích đúng ${imageCount} ảnh flashcard theo thứ tự.
Tên file gợi ý (có thể dùng nếu ảnh rõ): ${JSON.stringify(fileNames)}

Trả về DUY NHẤT JSON đúng schema:
{
  "schemaVersion": ${SCHEMA_VERSION},
  "topics": [
    {
      "nameEnglish": string,
      "nameVietnamese": string,
      "category": one of animals|food_drinks|colors|numbers|shapes|body_parts|actions|emotions|positions|objects|general,
      "confidence": 0-1,
      "recommendedExerciseIds": ["flashcard","listen-and-choose","choose-word","yes-no"],
      "cards": [
        {
          "sourceImageIndex": number,
          "cropBox": null,
          "word": English word lowercase,
          "normalizedWord": same,
          "meaningVietnamese": Vietnamese meaning,
          "partOfSpeech": "noun"|...,
          "imageDescription": short English,
          "tags": [],
          "exampleEnglish": "This is a cat.",
          "exampleVietnamese": "Đây là một con mèo.",
          "trueStatement": "This is a cat.",
          "falseStatement": "This is a dog.",
          "situationQuestion": null or short question,
          "compatibleExerciseIds": ["flashcard","listen-and-choose","choose-word","yes-no"],
          "confidence": 0-1,
          "reviewFlags": []
        }
      ],
      "miniStory": null
    }
  ],
  "warnings": []
}

Quy tắc:
- Mỗi ảnh đúng 1 thẻ; sourceImageIndex từ 0 đến ${imageCount - 1}.
- Tự nhóm thành 1 hoặc nhiều chủ đề nếu cần.
- Điền đủ nghĩa tiếng Việt, ví dụ Anh/Việt; phụ huynh chỉ xác nhận.
- Không Markdown, không giải thích ngoài JSON.`
}

async function callGemini(images, fileNames) {
  if (!GEMINI_API_KEY) {
    throw new Error('Thiếu GEMINI_API_KEY trên server.')
  }

  const parts = [
    { text: buildPrompt(images.length, fileNames) },
    ...images.map((image) => ({
      inline_data: {
        mime_type: image.mimeType,
        data: image.base64,
      },
    })),
  ]

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini lỗi ${response.status}: ${text.slice(0, 200)}`)
  }

  const payload = await response.json()
  const text =
    payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') ||
    ''
  if (!text) {
    throw new Error('Gemini không trả nội dung.')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini không trả JSON hợp lệ.')
  }

  return aiAnalysisResponseSchema.parse(normalizeAnalysis(parsed))
}

function normalizeAnalysis(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const topics = Array.isArray(source.topics) ? source.topics : []
  return {
    schemaVersion: SCHEMA_VERSION,
    topics: topics.map((topic) => ({
      nameEnglish: topic?.nameEnglish || 'My Words',
      nameVietnamese: topic?.nameVietnamese || 'Từ của bé',
      category: topic?.category || 'general',
      confidence: clamp01(topic?.confidence ?? 0.7),
      recommendedExerciseIds: Array.isArray(topic?.recommendedExerciseIds)
        ? topic.recommendedExerciseIds.slice(0, 13)
        : ['flashcard', 'listen-and-choose', 'choose-word', 'yes-no'],
      cards: (Array.isArray(topic?.cards) ? topic.cards : []).map((card, index) => ({
        sourceImageIndex:
          typeof card?.sourceImageIndex === 'number' ? card.sourceImageIndex : index,
        cropBox: card?.cropBox ?? null,
        word: card?.word ?? null,
        normalizedWord: card?.normalizedWord ?? card?.word ?? null,
        meaningVietnamese: card?.meaningVietnamese ?? null,
        partOfSpeech: card?.partOfSpeech ?? 'noun',
        imageDescription: card?.imageDescription || card?.word || 'flashcard',
        tags: Array.isArray(card?.tags) ? card.tags.slice(0, 12) : [],
        exampleEnglish: card?.exampleEnglish ?? null,
        exampleVietnamese: card?.exampleVietnamese ?? null,
        trueStatement: card?.trueStatement ?? null,
        falseStatement: card?.falseStatement ?? null,
        situationQuestion: card?.situationQuestion ?? null,
        compatibleExerciseIds: Array.isArray(card?.compatibleExerciseIds)
          ? card.compatibleExerciseIds.slice(0, 13)
          : ['flashcard', 'listen-and-choose', 'choose-word', 'yes-no'],
        confidence: clamp01(card?.confidence ?? 0.7),
        reviewFlags: (
          Array.isArray(card?.reviewFlags) ? card.reviewFlags : []
        ).filter((flag) =>
          [
            'low_confidence',
            'unreadable',
            'duplicate',
            'ambiguous_topic',
            'invalid_sentence',
          ].includes(flag),
        ),
      })),
      miniStory: topic?.miniStory ?? null,
    })),
    warnings: (Array.isArray(source.warnings) ? source.warnings : [])
      .map((warning) => {
        if (typeof warning === 'string') {
          return {
            sourceImageIndex: null,
            code: 'model_warning',
            messageVietnamese: warning.slice(0, 240),
          }
        }
        return {
          sourceImageIndex: warning?.sourceImageIndex ?? null,
          code: warning?.code || 'model_warning',
          messageVietnamese:
            warning?.messageVietnamese || 'Có cảnh báo từ AI.',
        }
      })
      .slice(0, 40),
  }
}

function clamp01(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return 0.7
  return Math.max(0, Math.min(1, number))
}

function sendJson(res, status, body) {
  const raw = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(raw),
  })
  res.end(raw)
}

const server = http.createServer(async (req, res) => {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, hasKey: Boolean(GEMINI_API_KEY) })
    return
  }

  if (req.method === 'POST' && req.url === '/analyze') {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown'
    if (!rateLimit(ip)) {
      sendJson(res, 429, { error: 'Quá nhiều yêu cầu. Thử lại sau một phút.' })
      return
    }

    try {
      const raw = await readBody(req, MAX_BODY_BYTES)
      const body = JSON.parse(raw.toString('utf8'))
      const images = Array.isArray(body.images) ? body.images : []
      if (images.length === 0 || images.length > MAX_IMAGES) {
        sendJson(res, 400, {
          error: `Số ảnh phải từ 1 đến ${MAX_IMAGES}.`,
        })
        return
      }

      const normalized = images.map((image, index) => {
        if (!image?.base64 || !image?.mimeType) {
          throw new Error(`Ảnh ${index} thiếu dữ liệu.`)
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) {
          throw new Error(`Ảnh ${index} không đúng định dạng.`)
        }
        return {
          mimeType: image.mimeType,
          base64: String(image.base64).replace(/^data:[^;]+;base64,/, ''),
          fileName: String(image.fileName || `image-${index + 1}`),
        }
      })

      const analysis = await callGemini(
        normalized,
        normalized.map((image) => image.fileName),
      )
      sendJson(res, 200, analysis)
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : 'Không phân tích được.',
      })
    }
    return
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`analyzer listening on ${PORT}`)
})
