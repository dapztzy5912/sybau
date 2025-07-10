require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simpan data bot di memory (bisa diganti database)
let bots = [];

// API Routes
app.get('/api/bots', (req, res) => {
  res.json(bots.slice(-6).reverse()); // Ambil 6 bot terakhir
});

app.post('/api/bots', (req, res) => {
  const { description, name, image } = req.body;
  
  if (!description || !name) {
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
  res.status(201).json(newBot);
});

app.get('/api/bots/:id', (req, res) => {
  const bot = bots.find(b => b.id === req.params.id);
  res.json(bot || { error: "Bot not found" });
});

// Endpoint untuk generate respons dari Gemini
app.post('/api/generate-response', async (req, res) => {
  const { message, botInfo } = req.body;
  const API_KEY = 'AIzaSyAq62jiQDWHtRja-aQyT006pYzW8SivK48'; // Ganti jika perlu
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

    const data = await response.json();
    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak bisa merespons sekarang.";
    res.json({ response: botReply });

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Gagal menghubungi AI" });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
