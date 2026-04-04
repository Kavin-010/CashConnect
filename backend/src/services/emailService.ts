import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}