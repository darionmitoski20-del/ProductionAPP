/**
 * Gmail SMTP via Nodemailer. Uses EMAIL_USER + EMAIL_PASS (App Password).
 * Optional EMAIL_TO (defaults to EMAIL_USER).
 */
import nodemailer from "nodemailer";

/**
 * @param {object} params
 * @param {string} params.orderId
 * @param {Array<{ product_name: string; quantity: number; subtotal: number }>} params.items
 * @param {number} params.total
 * @param {string} [params.orderTimeIso]
 */
export async function sendNewOrderEmail({
  orderId,
  items,
  total,
  orderTimeIso,
}) {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set");
  }
  const emailTo = process.env.EMAIL_TO?.trim() || emailUser;

  const lines =
    items?.length > 0
      ? items.map(
          (row) =>
            `• ${row.product_name} × ${Number(row.quantity)} — ${Number(row.subtotal).toFixed(2)}`
        )
      : ["(no line items)"];

  const text = [
    "New order received",
    "",
    `Order ID: ${orderId}`,
    `Order time: ${orderTimeIso ?? "—"}`,
    `Total: ${Number(total).toFixed(2)}`,
    "",
    "Items:",
    ...lines,
  ].join("\n");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPass },
  });

  await transporter.sendMail({
    from: emailUser,
    to: emailTo,
    subject: `New order ${String(orderId).slice(0, 8)}… — ${Number(total).toFixed(2)}`,
    text,
  });
}
