const express = require('express');
const axios = require('axios');
const pino = require('pino');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.SERVER_PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://client:3001';

const logger = pino({ level: 'info' });

let messages = [];

// ========================
// HEALTH
// ========================
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========================
// STATUS
// ========================
app.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${CLIENT_URL}/status`);
    res.json({
      server: 'ok',
      client: response.data
    });
  } catch (err) {
    res.json({
      server: 'ok',
      client: 'offline'
    });
  }
});

// ========================
// RECEBER MENSAGENS (futuro webhook)
// ========================
app.post('/incoming', (req, res) => {
  const { from, message } = req.body;

  messages.push({
    from,
    message,
    timestamp: new Date()
  });

  logger.info(`Mensagem recebida de ${from}`);

  res.json({ received: true });
});

// ========================
// LISTAR MENSAGENS
// ========================
app.get('/messages', (req, res) => {
  res.json(messages.slice(-50));
});

// ========================
// ENVIAR MENSAGEM
// ========================
app.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    const response = await axios.post(`${CLIENT_URL}/send`, {
      to,
      message
    });

    res.json(response.data);
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// START
// ========================
app.listen(PORT, () => {
  logger.info(`Server rodando na porta ${PORT}`);
});
