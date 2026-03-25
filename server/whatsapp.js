import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';
import fs from 'fs';

let client = null;
let qrCodeData = null;
let connectionStatus = 'disconnected'; // disconnected | qr_ready | connected | error

export function initWhatsApp() {
  console.log('[WhatsApp] Initializing...');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './sessions/whatsapp',
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', async (qr) => {
    console.log('[WhatsApp] QR code generated');
    connectionStatus = 'qr_ready';
    try {
      qrCodeData = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('[WhatsApp] QR generation error:', err);
    }
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Client is ready!');
    connectionStatus = 'connected';
    qrCodeData = null;
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated!');
    connectionStatus = 'connected';
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Auth failure:', msg);
    connectionStatus = 'error';
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Disconnected:', reason);
    connectionStatus = 'disconnected';
    qrCodeData = null;
  });

  client.initialize();
}

export function getWhatsAppStatus() {
  return {
    status: connectionStatus,
    hasQR: !!qrCodeData,
  };
}

export function getQRCode() {
  return qrCodeData;
}

export async function sendWhatsAppMessage(phoneNumber, message, filePath = null) {
  if (connectionStatus !== 'connected') {
    throw new Error(`WhatsApp not connected. Status: ${connectionStatus}`);
  }

  // Format number: remove spaces, dashes; ensure country code
  const formattedNumber = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
  const chatId = `${formattedNumber}@c.us`;

  if (filePath && fs.existsSync(filePath)) {
    const media = MessageMedia.fromFilePath(filePath);
    await client.sendMessage(chatId, media, { caption: message });
  } else {
    await client.sendMessage(chatId, message);
  }

  return { success: true, to: formattedNumber };
}

export function getClient() {
  return client;
}
