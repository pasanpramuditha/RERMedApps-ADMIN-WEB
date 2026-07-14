'use server';
/**
 * @fileOverview DeepSeek-backed helper for drafting replies to user feedback.
 */

import { z } from 'zod';

const DraftReplyInputSchema = z.object({
  feedback: z.string().min(1),
  feedbackLanguage: z.string().min(1),
  appName: z.string().optional(),
  platform: z.string().optional(),
  appContext: z.string().optional(),
  commonRules: z.string().optional(),
  knownLimitations: z.string().optional(),
  replyTone: z.string().optional(),
  maxReplyChars: z.number().int().positive().optional(),
  operatorDraft: z.string().optional(),
});
export type DraftReplyInput = z.infer<typeof DraftReplyInputSchema>;

const DraftReplyOutputSchema = z.object({
  reply: z.string().min(1),
});
export type DraftReplyOutput = z.infer<typeof DraftReplyOutputSchema>;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';

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

export async function draftReply(input: DraftReplyInput): Promise<DraftReplyOutput> {
  const parsed = DraftReplyInputSchema.parse(input);
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured.');
  }

  const model = process.env.DEEPSEEK_DRAFT_MODEL?.trim()
    || process.env.DEEPSEEK_TRANSLATION_MODEL?.trim()
    || DEFAULT_DEEPSEEK_MODEL;

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
            'You are a professional customer support assistant for RER MedApps, a suite of medical education apps. Draft a direct reply in English. Use the provided app-specific knowledge when available. If the feedback is common, use the common support rules. Never invent features, policies, timelines, or fixes. Do not use markdown.',
        },
        {
          role: 'user',
          content: `App: ${parsed.appName || 'Unknown app'}
Platform: ${parsed.platform || 'Unknown platform'}
Feedback language: ${parsed.feedbackLanguage}
Preferred tone: ${parsed.replyTone || 'professional, friendly, concise'}
Maximum reply length: ${parsed.maxReplyChars || 450} characters

App-specific context:
${parsed.appContext || 'No app-specific context configured.'}

Known limitations:
${parsed.knownLimitations || 'No known limitations configured.'}

Common reply rules:
${parsed.commonRules || 'Thank the user, address the issue directly, ask for details when needed, and do not promise future features.'}

${parsed.operatorDraft?.trim() ? `Admin-written reply to polish:
${parsed.operatorDraft.trim()}

Use the admin-written reply as the primary intent and content. Rewrite it into a clear, professional customer reply, but do not replace it with a different answer. Preserve any policy reason, limitation, decision, or instruction the admin wrote unless it conflicts with the configured knowledge above.
` : ''}

User feedback:
${parsed.feedback}

Draft one helpful support reply in English within the maximum character limit.`,
        },
      ],
      stream: false,
      temperature: 0.35,
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

  const reply = payload?.choices?.[0]?.message?.content?.trim();
  const parsedOutput = DraftReplyOutputSchema.safeParse({ reply });

  if (!parsedOutput.success) {
    throw new Error(`DeepSeek response did not include a draft reply: ${raw.slice(0, 400)}`);
  }

  return parsedOutput.data;
}
