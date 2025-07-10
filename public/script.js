document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const homePage = document.getElementById('home-page');
  const creationPage = document.getElementById('creation-page');
  const chatPage = document.getElementById('chat-page');
  const createBotBtn = document.getElementById('create-bot-btn');
  const backBtn = document.getElementById('back-btn');
  const createBtn = document.getElementById('create-btn');
  const backToHome = document.getElementById('back-to-home');
  const shareBtn = document.getElementById('share-btn');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const chatMessages = document.getElementById('chat-messages');
  const chatBotName = document.getElementById('chat-bot-name');
  const chatBotImage = document.getElementById('chat-bot-image');
  const botsList = document.getElementById('bots-list');
  
  // State
  let currentBot = null;
  
  // Initialize
  loadBots();
  checkUrlForBot();

  // Event Listeners
  createBotBtn.addEventListener('click', showCreationPage);
  backBtn.addEventListener('click', showHomePage);
  backToHome.addEventListener('click', showHomePage);
  createBtn.addEventListener('click', createBot);
  shareBtn.addEventListener('click', shareBot);
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

  // Fungsi Navigasi
  function showPage(page) {
    homePage.style.display = 'none';
    creationPage.style.display = 'none';
    chatPage.style.display = 'none';
    document.getElementById(`${page}-page`).style.display = 'block';
  }

  function showHomePage() {
    showPage('home');
    window.history.pushState({}, '', '/');
  }

  function showCreationPage() {
    showPage('creation');
  }

  function showChatPage() {
    showPage('chat');
    chatBotName.textContent = currentBot.name;
    chatBotImage.src = currentBot.image;
    chatMessages.innerHTML = `<div class="message bot-message">Hai! Saya ${currentBot.name}. ${currentBot.description.substring(0, 50)}...</div>`;
  }

  // Fungsi Bot
  async function loadBots() {
    try {
      const response = await fetch('/api/bots');
      const bots = await response.json();
      renderBots(bots);
    } catch (error) {
      console.error("Gagal memuat bot:", error);
    }
  }

  function renderBots(bots) {
    botsList.innerHTML = bots.map(bot => `
      <div class="col-md-4 mb-3">
        <div class="card bot-card">
          <img src="${bot.image}" class="card-img-top" alt="${bot.name}">
          <div class="card-body">
            <h5 class="card-title">${bot.name}</h5>
            <p class="card-text">${bot.description.substring(0, 50)}...</p>
            <button class="btn btn-sm btn-success chat-with-bot" data-bot-id="${bot.id}">Chat</button>
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.chat-with-bot').forEach(btn => {
      btn.addEventListener('click', async () => {
        const botId = btn.getAttribute('data-bot-id');
        const response = await fetch(`/api/bots/${botId}`);
        currentBot = await response.json();
        showChatPage();
        window.history.pushState({}, '', `?bot=${botId}`);
      });
    });
  }

  async function createBot() {
    const description = document.getElementById('bot-description').value.trim();
    const name = document.getElementById('bot-name').value.trim();
    const image = document.getElementById('bot-image').value.trim();

    if (!description || !name) {
      alert("Deskripsi dan nama bot harus diisi!");
      return;
    }

    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, name, image })
      });
      
      currentBot = await response.json();
      showChatPage();
      loadBots();
    } catch (error) {
      console.error("Gagal membuat bot:", error);
    }
  }

  // Fungsi Chat
  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || !currentBot) return;

    addMessage(message, 'user');
    userInput.value = '';

    try {
      const typingId = addMessage("...", 'bot', true);
      
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          botInfo: currentBot 
        })
      });

      const data = await response.json();
      updateMessage(typingId, data.response, 'bot');
    } catch (error) {
      console.error("Error:", error);
      addMessage("Maaf, terjadi error saat memproses pesan.", 'bot');
    }
  }

  function addMessage(text, sender, isTemp = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    if (isTemp) messageDiv.id = `temp-${Date.now()}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return isTemp ? messageDiv.id : null;
  }

  function updateMessage(id, newText, sender) {
    const messageDiv = document.getElementById(id);
    if (messageDiv) {
      messageDiv.textContent = newText;
      messageDiv.className = `message ${sender}-message`;
      messageDiv.id = '';
    }
  }

  // Fungsi Lainnya
  function checkUrlForBot() {
    const params = new URLSearchParams(window.location.search);
    const botId = params.get('bot');
    if (botId) fetch(`/api/bots/${botId}`)
      .then(res => res.json())
      .then(bot => { currentBot = bot; showChatPage(); })
      .catch(console.error);
  }

  function shareBot() {
    if (!currentBot) return;
    const url = `${window.location.origin}?bot=${currentBot.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Chat dengan ${currentBot.name}`,
        text: `Saya membuat bot AI: ${currentBot.name}`,
        url
      }).catch(() => copyToClipboard(url));
    } else {
      copyToClipboard(url);
      alert("Link bot disalin!");
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }
});
