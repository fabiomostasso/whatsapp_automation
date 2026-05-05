const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.CLIENT_PORT || 3001;

let sock = null;
let currentQR = null;
let isConnected = false;
let reconnectAttempts = 0;

const MAX_RECONNECT = 10;
const RECONNECT_DELAY = 5000;

const logger = pino({ level: 'info' });

// ========================
// CONEXÃO WHATSAPP
// ========================
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      logger.info('QR Code gerado');
    }

    if (connection === 'open') {
      logger.info('WhatsApp conectado');
      isConnected = true;
      reconnectAttempts = 0;
      currentQR = null;
    }

    if (connection === 'close') {
      isConnected = false;

      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        logger.warn(`Reconectando (${reconnectAttempts})...`);
        setTimeout(startWhatsApp, RECONNECT_DELAY);
      } else {
        logger.error('Desconectado permanentemente');
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// ========================
// ROTAS API
// ========================

// QR Code
app.get('/qr', async (req, res) => {
  if (!currentQR) {
    return res.json({ status: 'aguardando QR' });
  }

  const qrImage = await QRCode.toDataURL(currentQR);
  res.send(`<img src="${qrImage}" />`);
});

// Status
app.get('/status', (req, res) => {
  res.json({
    connected: isConnected,
    reconnectAttempts
  });
});

// Enviar mensagem
app.post('/send', async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    const { to, message } = req.body;

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// START
// ========================
app.listen(PORT, () => {
  logger.info(`Client rodando na porta ${PORT}`);
  startWhatsApp();
});
