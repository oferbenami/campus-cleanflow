import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import {
  getAuthStatus,
  openLoginPage,
  getNotebooks,
  getNotebookFiles,
  downloadFile,
} from './notebooklm.js';

import {
  initWhatsApp,
  getWhatsAppStatus,
  getQRCode,
  sendWhatsAppMessage,
} from './whatsapp.js';

import { sendGmail, getGmailStatus } from './gmail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Status ────────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({
    server: 'online',
    whatsapp: getWhatsAppStatus(),
    gmail: getGmailStatus(),
  });
});

// ─── NotebookLM ────────────────────────────────────────────────────────────

app.get('/api/notebooklm/auth', async (req, res) => {
  const status = await getAuthStatus();
  res.json(status);
});

app.post('/api/notebooklm/login', async (req, res) => {
  const result = await openLoginPage();
  res.json(result);
});

app.get('/api/notebooklm/notebooks', async (req, res) => {
  const result = await getNotebooks();
  res.json(result);
});

app.get('/api/notebooklm/notebooks/:id/files', async (req, res) => {
  const result = await getNotebookFiles(req.params.id);
  res.json(result);
});

app.post('/api/notebooklm/download', async (req, res) => {
  const { notebookId, fileType } = req.body;
  if (!notebookId || !fileType) {
    return res.status(400).json({ error: 'notebookId and fileType are required' });
  }
  const result = await downloadFile(notebookId, fileType);
  res.json(result);
});

// ─── WhatsApp ──────────────────────────────────────────────────────────────

app.get('/api/whatsapp/status', (req, res) => {
  res.json(getWhatsAppStatus());
});

app.get('/api/whatsapp/qr', (req, res) => {
  const qr = getQRCode();
  if (!qr) {
    return res.status(404).json({ error: 'QR code not available yet' });
  }
  res.json({ qr });
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message, fileKey } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  try {
    const filePath = fileKey ? path.join(DOWNLOADS_DIR, fileKey) : null;
    const result = await sendWhatsAppMessage(phone, message || '', filePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Gmail ─────────────────────────────────────────────────────────────────

app.post('/api/gmail/send', async (req, res) => {
  const { to, subject, body, fileKey } = req.body;
  if (!to) return res.status(400).json({ error: 'to (email) is required' });

  try {
    const filePath = fileKey ? path.join(DOWNLOADS_DIR, fileKey) : null;
    const fileName = fileKey || undefined;
    const result = await sendGmail({ to, subject, body, filePath, fileName });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Downloads cleanup ─────────────────────────────────────────────────────

app.delete('/api/downloads/:fileName', (req, res) => {
  const filePath = path.join(DOWNLOADS_DIR, req.params.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 NotebookLM Share Server running on http://localhost:${PORT}`);
  console.log(`📧 Gmail: ${process.env.GMAIL_USER || 'NOT CONFIGURED'}`);
  console.log(`💬 Initializing WhatsApp...\n`);
  initWhatsApp();
});
