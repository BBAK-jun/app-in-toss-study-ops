// Discord webhook 발송 + 현황 메시지 페이로드 생성. ARCHITECTURE.md 4-6 코드 기반.
import { HttpError } from '../lib/http-error';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
}

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload,
): Promise<{ ok: true; discordResponse: unknown }> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(
      502,
      'DISCORD_WEBHOOK_FAILED',
      `Discord webhook failed (${res.status}): ${text}`,
    );
  }

  const discordResponse = await res.text().then((t) => t || null);
  return { ok: true, discordResponse };
}

// 현황 메시지 생성 헬퍼. notSubmittedHandles 는 discordHandle 또는 name.
export function buildStatusPayload(opts: {
  roundNumber: number;
  roundTitle: string;
  rate: number;
  submittedCount: number;
  total: number;
  notSubmittedHandles: string[];
  dueAt: number | null;
}): DiscordWebhookPayload {
  const pct = Math.round(opts.rate * 100);
  const due = opts.dueAt ? new Date(opts.dueAt).toLocaleString('ko-KR') : '미정';
  const mentions = opts.notSubmittedHandles
    .map((h) => (h.startsWith('@') ? h : `@${h}`))
    .join(' ');

  return {
    content: mentions ? `📚 제출 현황 공유\n${mentions}` : '📚 제출 현황 공유',
    embeds: [
      {
        title: `[${opts.roundNumber}회차] ${opts.roundTitle}`,
        description: `제출률 **${opts.submittedCount}/${opts.total} (${pct}%)**\n마감: ${due}`,
        color: pct >= 80 ? 0x22C55E : pct >= 50 ? 0xF59E0B : 0xEF4444,
        fields: opts.notSubmittedHandles.length
          ? [
              {
                name: '미제출자',
                value:
                  opts.notSubmittedHandles
                    .map((h) => (h.startsWith('@') ? h : `@${h}`))
                    .join(', ') || '없음',
                inline: false,
              },
            ]
          : [],
        footer: { text: 'StudyOps Bot' },
      },
    ],
  };
}
