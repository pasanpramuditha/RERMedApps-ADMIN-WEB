'use server';
/**
 * @fileOverview DeepSeek-backed translation helper.
 *
 * The user-feedback reply dialog imports `translateText` directly. Keep this
 * file server-only so the DeepSeek API key never reaches the browser.
 */

import { z } from 'zod';

const TranslateInputSchema = z.object({
  text: z.string().min(1),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.string().optional(),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.object({
  translation: z.string(),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';

const languageCodeToName: Record<string, string> = {
  AF: 'Afrikaans',
  AR: 'Arabic',
  BG: 'Bulgarian',
  BN: 'Bengali',
  BS: 'Bosnian',
  CA: 'Catalan',
  CS: 'Czech',
  DA: 'Danish',
  DE: 'German',
  EL: 'Greek',
  EN: 'English',
  ES: 'Spanish',
  ET: 'Estonian',
  FA: 'Persian',
  FI: 'Finnish',
  FR: 'French',
  GU: 'Gujarati',
  HE: 'Hebrew',
  HI: 'Hindi',
  HR: 'Croatian',
  HU: 'Hungarian',
  ID: 'Indonesian',
  IT: 'Italian',
  JA: 'Japanese',
  JW: 'Javanese',
  KN: 'Kannada',
  KO: 'Korean',
  LT: 'Lithuanian',
  LV: 'Latvian',
  ML: 'Malayalam',
  MR: 'Marathi',
  MS: 'Malay',
  NL: 'Dutch',
  NO: 'Norwegian',
  PA: 'Punjabi',
  PL: 'Polish',
  PT: 'Portuguese',
  RO: 'Romanian',
  RU: 'Russian',
  SI: 'Sinhala',
  SK: 'Slovak',
  SL: 'Slovenian',
  SQ: 'Albanian',
  SR: 'Serbian',
  SV: 'Swedish',
  SW: 'Swahili',
  TA: 'Tamil',
  TE: 'Telugu',
  TH: 'Thai',
  TL: 'Filipino',
  TR: 'Turkish',
  UK: 'Ukrainian',
  UR: 'Urdu',
  VI: 'Vietnamese',
  ZH: 'Chinese',
};

function normalizeLanguage(language: string) {
  const code = language.trim().toUpperCase();
  return languageCodeToName[code] || code || language;
}

function extractDeepSeekError(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeError = (payload as { error?: { message?: unknown } }).error;
  if (maybeError && typeof maybeError.message === 'string') {
    return maybeError.message;
  }

  return null;
}

export async function translateText(input: TranslateInput): Promise<TranslateOutput> {
  const parsed = TranslateInputSchema.parse(input);
  const targetLanguage = parsed.targetLanguage || 'EN';

  if (parsed.sourceLanguage.toUpperCase() === targetLanguage.toUpperCase()) {
    return { translation: parsed.text };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured.');
  }

  const sourceLanguageName = normalizeLanguage(parsed.sourceLanguage);
  const targetLanguageName = normalizeLanguage(targetLanguage);
  const model = process.env.DEEPSEEK_TRANSLATION_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translation engine. Return only the translated text. Do not explain, summarize, add quotes, or add markdown.',
        },
        {
          role: 'user',
          content: `Translate from ${sourceLanguageName} to ${targetLanguageName}. Preserve meaning, tone, medical terms, line breaks, and user intent.\n\nText:\n${parsed.text}`,
        },
      ],
      stream: false,
      temperature: 0.1,
    }),
  });

  const raw = await response.text();
  let payload: any = {};

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`DeepSeek returned non-JSON response: ${raw.slice(0, 400)}`);
  }

  if (!response.ok) {
    throw new Error(extractDeepSeekError(payload) || `DeepSeek API error: ${response.status}`);
  }

  const translation = payload?.choices?.[0]?.message?.content?.trim();
  const parsedOutput = TranslateOutputSchema.safeParse({ translation });

  if (!parsedOutput.success || !parsedOutput.data.translation) {
    throw new Error(`DeepSeek response did not include translated text: ${raw.slice(0, 400)}`);
  }

  return parsedOutput.data;
}
