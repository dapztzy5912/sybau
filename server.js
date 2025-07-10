require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

let bots = [];

app.post('/api/ai', async (req, res) => {
  console.log('Menerima permintaan ke /api/ai:', req.body);
  const { prompt, content } = req.body;
  if (!prompt || !content) {
    console.log('Prompt atau content kosong.');
    return res.status(400).json({ error: "Prompt and content are required" });
  }

  const finalContent = `${content}. Jawablah sebagai karakter ini, jangan keluar dari peran.`;
  const apiUrl = `https://api.only-awan.biz.id/api/ai/gpt3?prompt=${encodeURIComponent(prompt)}&content=${encodeURIComponent(finalContent)}&apikey=jcj6uqsC`;

  console.log('Memanggil API:', apiUrl);
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error('Gagal memanggil API:', response.status, response.statusText);
      throw new Error(`Gagal memanggil API: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    console.log('Respon API:', result);
    const aiResponse = result.data?.data || "Tidak ada respon dari AI.";
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error calling external AI:", error);
    res.status(500).json({ error: "Failed to call AI API" });
  }
});

app.get('/api/bots', async (req, res) => {
  console.log('Menerima permintaan ke /api/bots');
  try {
    res.json(bots.slice(-6).reverse());
  } catch (error) {
    console.error('Gagal mendapatkan daftar bot:', error);
    res.status(500).json({ error: "Failed to get bots" });
  }
});

app.post('/api/bots', async (req, res) => {
  console.log('Menerima permintaan ke /api/bots:', req.body);
  const { description, name, image } = req.body;
  if (!description || !name) {
    console.log('Deskripsi atau nama bot kosong.');
    return res.status(400).json({ error: "Description and name are required" });
  }

  const newBot = {
    id: generateId(),
    name,
    description,
    image: image || 'https://via.placeholder.com/150',
    createdAt: new Date().toISOString()
  };
  bots.push(newBot);
  console.log('Bot baru dibuat:', newBot);
  res.status(201).json(newBot);
});

app.get('/api/bots/:id', async (req, res) => {
  const botId = req.params.id;
  console.log(`Menerima permintaan ke /api/bots/${botId}`);
  try {
    const bot = bots.find(b => b.id === botId);
    if (!bot) {
      console.log(`Bot dengan ID ${botId} tidak ditemukan.`);
      return res.status(404).json({ error: "Bot not found" });
    }
    res.json(bot);
  } catch (error) {
    console.error(`Gagal mendapatkan bot dengan ID ${botId}:`, error);
    res.status(500).json({ error: "Failed to get bot" });
  }
});

app.post('/api/generate-response', async (req, res) => {
  console.log('Menerima permintaan ke /api/generate-response:', req.body);
  const { message, botInfo } = req.body;
  const API_KEY = 'AIzaSyAq62jiQDWHtRja-aQyT006pYzW8SivK48';
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Kamu adalah ${botInfo.name}, sebuah AI dengan karakteristik: ${botInfo.description}. Pengguna mengirim: "${message}". Berikan respons yang natural dan relevan.`
          }]
        }]
      })
    });
    if (!response.ok) {
      console.error('Gagal memanggil Gemini API:', response.status, response.statusText);
      throw new Error(`Gagal memanggil Gemini API: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Respon Gemini API:', data);
    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak bisa merespons sekarang.";
    res.json({ response: botReply });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Gagal menghubungi AI" });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
