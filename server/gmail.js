import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return transporter;
}

export async function sendGmail({ to, subject, body, filePath, fileName }) {
  const transport = getTransporter();

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: subject || 'קובץ מ-NotebookLM',
    text: body || 'מצורף קובץ שהורד מ-NotebookLM',
    html: `<div dir="rtl"><p>${body || 'מצורף קובץ שהורד מ-NotebookLM'}</p></div>`,
  };

  if (filePath && fs.existsSync(filePath)) {
    mailOptions.attachments = [
      {
        filename: fileName || path.basename(filePath),
        path: filePath,
      },
    ];
  }

  const info = await transport.sendMail(mailOptions);
  return { success: true, messageId: info.messageId, to };
}

export function getGmailStatus() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  return {
    configured: !!(user && pass),
    user: user || null,
  };
}
