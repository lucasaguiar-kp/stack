import { env } from "@stack-pbx/env/server";
import nodemailer from "nodemailer";
import { AppError } from "../errors/app-error";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getMailConfig() {
  if (!env.MAIL_USER || !env.MAIL_PASSWORD) {
    throw new AppError("INTERNAL_SERVER_ERROR", {
      message: "Mail configuration is missing",
    });
  }

  return {
    user: env.MAIL_USER,
    pass: env.MAIL_PASSWORD,
    from: env.MAIL_FROM ?? env.MAIL_USER,
  };
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const { user, pass } = getMailConfig();

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  const { from } = getMailConfig();
  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}
