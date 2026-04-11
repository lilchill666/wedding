// Cloudflare Worker — RSVP → Telegram bridge.
//
// Setup:
//   1. Create a Telegram bot via @BotFather, copy its token.
//   2. Send any message to the bot, then open
//      https://api.telegram.org/bot<TOKEN>/getUpdates and copy your chat id.
//   3. npm install -g wrangler && wrangler login
//   4. wrangler init (pick "Hello World" worker, paste this file as src/index.js)
//   5. wrangler secret put TELEGRAM_TOKEN
//      wrangler secret put TELEGRAM_CHAT_ID
//   6. wrangler deploy
//   7. Paste the resulting https://<name>.workers.dev URL into script.js as RSVP_ENDPOINT.
//
// Tighten ALLOWED_ORIGIN to your site's domain once deployed.

const ALLOWED_ORIGIN = "*";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors() });
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ error: "bad json" }, 400);
    }

    const guest = sanitize(data.guest, 200);
    const token = sanitize(data.token, 100);
    const answer = data.answer === "yes" ? "✅ БУДЕ" : "❌ не зможе";
    const ts = sanitize(data.timestamp, 60) || new Date().toISOString();

    const text =
      `💌 <b>RSVP</b>\n\n` +
      `${answer}\n\n` +
      `<b>Гість:</b> ${escapeHtml(guest)}\n` +
      `<b>Токен:</b> <code>${escapeHtml(token)}</code>\n` +
      `<b>Час:</b> ${escapeHtml(ts)}`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    if (!tgRes.ok) {
      const body = await tgRes.text();
      return json({ error: "telegram failed", detail: body }, 502);
    }
    return json({ ok: true });
  },
};

function sanitize(value, max) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function cors() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}
