import "dotenv/config";
import nodemailer from "nodemailer";

export async function sendMail({ to, subject, text }) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  // Dev fallback: if SMTP not configured, just log
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.log("---- EMAIL (DEV) ----");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("---------------------");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
  });
}
