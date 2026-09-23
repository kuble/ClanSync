const WEBHOOK = /^https:\/\/discord\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/;

export function isDiscordWebhookUrl(value: string): boolean {
  return value === value.trim() && value.length <= 2048 && WEBHOOK.test(value);
}

/** Validate at the last boundary too: stored configuration is untrusted input. */
export async function postDiscordWebhook(url: string, content: string, timeout = 10_000): Promise<Response> {
  if (!isDiscordWebhookUrl(url)) throw new Error("허용되지 않은 Discord 웹훅 주소입니다.");
  return fetch(url, {
    method: "POST", redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }), signal: AbortSignal.timeout(timeout),
  });
}
