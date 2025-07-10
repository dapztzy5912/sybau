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

// In-memory storage for bots (replace with database in production)
let bots = [];

// API Routes
app.get('/api/bots', (req, res) => {
  res.json(bots.slice(-6).reverse()); // Return last 6 created bots
});

app.post('/api/bots', (req, res) => {
  const { description, name, image } = req.body;
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
  if (bot) {
    res.json(bot);
  } else {
    res.status(404).json({ error: 'Bot not found' });
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
