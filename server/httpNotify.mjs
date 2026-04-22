/**
 * Optional HTTP receiver for DB webhooks or internal tools.
 * Set ORDER_NOTIFY_WEBHOOK_SECRET and send header x-order-notify-secret.
 */
import "dotenv/config";
import { createServer } from "http";
import { sendNewOrderEmail } from "./sendOrderEmail.mjs";

const PORT = Number(process.env.PORT) || 3847;
const secret = process.env.ORDER_NOTIFY_WEBHOOK_SECRET;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/notify-order") {
    res.writeHead(404);
    res.end();
    return;
  }
  if (!secret || req.headers["x-order-notify-secret"] !== secret) {
    res.writeHead(401);
    res.end("Unauthorized");
    return;
  }
  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw || "{}");
  } catch {
    res.writeHead(400);
    res.end("Invalid JSON");
    return;
  }

  const { orderId, items, total, orderTimeIso } = payload;
  if (!orderId || typeof total !== "number") {
    res.writeHead(400);
    res.end("Missing orderId or total");
    return;
  }

  try {
    await sendNewOrderEmail({
      orderId,
      items: Array.isArray(items) ? items : [],
      total,
      orderTimeIso,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("[httpNotify] send failed", e);
    res.writeHead(502);
    res.end("Email failed");
  }
}).listen(PORT, () => {
  console.log(`Order notify listening on :${PORT} POST /notify-order`);
});
