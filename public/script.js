document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements and state
    const pages = {
        home: document.getElementById('home-page'),
        creation: document.getElementById('creation-page'),
        chat: document.getElementById('chat-page')
    };
    const currentBot = { value: null };
    
    // API Configuration
    const API_KEY = 'AIzaSyB_6PFbktl04BHmkUOCODJxXm4ubKy3fww';
    const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${API_KEY}&alt=sse`;
    
    // Initialize
    setupEventListeners();
    loadBots();
    checkUrlForBot();

    function setupEventListeners() {
        // Navigation
        document.getElementById('create-bot-btn').addEventListener('click', () => showPage('creation'));
        document.getElementById('back-btn').addEventListener('click', () => showPage('home'));
        document.getElementById('back-to-home').addEventListener('click', () => showPage('home'));
        
        // Bot creation
        document.getElementById('create-btn').addEventListener('click', createBot);
        
        // Chat functionality
        document.getElementById('send-btn').addEventListener('click', sendMessage);
        document.getElementById('user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Sharing
        document.getElementById('share-btn').addEventListener('click', shareBot);
    }

    function showPage(pageName) {
        Object.values(pages).forEach(page => page.style.display = 'none');
        pages[pageName].style.display = 'block';
        
        if (pageName === 'chat' && currentBot.value) {
            setupChatPage();
        }
    }

    async function loadBots() {
        try {
            const response = await fetch('/api/bots');
            const bots = await response.json();
            renderBots(bots);
        } catch (error) {
            console.error('Error loading bots:', error);
        }
    }

    function renderBots(bots) {
        const container = document.getElementById('bots-list');
        container.innerHTML = bots.length === 0 
            ? '<p>No bots created yet. Be the first to create one!</p>'
            : bots.map(bot => `
                <div class="col-md-4">
                    <div class="bot-card">
                        <img src="${bot.image}" class="card-img-top" alt="${bot.name}">
                        <div class="card-body">
                            <h5 class="card-title">${bot.name}</h5>
                            <p class="card-text text-muted">${bot.description.substring(0, 50)}...</p>
                            <button class="btn btn-sm btn-success chat-with-bot" data-bot-id="${bot.id}">Chat</button>
                        </div>
                    </div>
                </div>
            `).join('');
        
        // Add event listeners to bot buttons
        document.querySelectorAll('.chat-with-bot').forEach(btn => {
            btn.addEventListener('click', async () => {
                const botId = btn.getAttribute('data-bot-id');
                try {
                    const response = await fetch(`/api/bots/${botId}`);
                    currentBot.value = await response.json();
                    showPage('chat');
                    updateUrl(`?bot=${botId}`);
                } catch (error) {
                    console.error('Error loading bot:', error);
                }
            });
        });
    }

    async function createBot() {
        const description = document.getElementById('bot-description').value.trim();
        const name = document.getElementById('bot-name').value.trim();
        const image = document.getElementById('bot-image').value.trim();
        
        if (!description || !name) {
            alert('Please provide both a description and a name for your bot');
            return;
        }
        
        try {
            const response = await fetch('/api/bots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, name, image })
            });
            
            currentBot.value = await response.json();
            showPage('chat');
            updateUrl(`?bot=${currentBot.value.id}`);
            loadBots(); // Refresh the bot list
        } catch (error) {
            console.error('Error creating bot:', error);
        }
    }

    function setupChatPage() {
        const bot = currentBot.value;
        document.getElementById('chat-bot-name').textContent = bot.name;
        document.getElementById('chat-bot-image').src = bot.image;
        
        // Clear chat messages and add welcome
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        addMessage(chatMessages, `Hello! I'm ${bot.name}. ${bot.description.substring(0, 50)}...`, 'bot');
    }

    async function sendMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        if (!message || !currentBot.value) return;
        
        const chatMessages = document.getElementById('chat-messages');
        addMessage(chatMessages, message, 'user');
        input.value = '';
        
        // Show typing indicator
        const typingId = addMessage(chatMessages, '...', 'bot', true);
        
        try {
            const response = await fetchGeminiResponse(message);
            updateMessage(chatMessages, typingId, response, 'bot');
        } catch (error) {
            console.error('Error generating response:', error);
            updateMessage(chatMessages, typingId, "Sorry, I couldn't generate a response.", 'bot');
        }
    }

    async function fetchGeminiResponse(message) {
        const prompt = {
            contents: [{
                parts: [{
                    text: `You are ${currentBot.value.name}, a chatbot with these characteristics: ${currentBot.value.description}. 
                    Respond to this message naturally: "${message}"`
                }]
            }]
        };
        
        const eventSource = new EventSource(`${GEMINI_API}&contents=${encodeURIComponent(JSON.stringify(prompt.contents))}`);
        
        return new Promise((resolve, reject) => {
            let fullResponse = '';
            
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    fullResponse += data.candidates[0].content.parts[0].text;
                }
            };
            
            eventSource.onerror = () => {
                eventSource.close();
                fullResponse ? resolve(fullResponse) : reject(new Error('No response generated'));
            };
        });
    }

    function shareBot() {
        if (!currentBot.value) return;
        const shareUrl = `${window.location.origin}?bot=${currentBot.value.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: `Chat with ${currentBot.value.name}`,
                text: `Check out this AI bot I created: ${currentBot.value.name}`,
                url: shareUrl
            }).catch(() => copyToClipboard(shareUrl));
        } else {
            copyToClipboard(shareUrl);
        }
    }

    function checkUrlForBot() {
        const params = new URLSearchParams(window.location.search);
        const botId = params.get('bot');
        if (botId) {
            fetch(`/api/bots/${botId}`)
                .then(response => response.json())
                .then(bot => {
                    currentBot.value = bot;
                    showPage('chat');
                })
                .catch(console.error);
        }
    }

    // Helper functions
    function addMessage(container, text, sender, isTemporary = false) {
        const messageId = isTemporary ? 'temp-' + Date.now() : '';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        if (isTemporary) messageDiv.id = messageId;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        return messageId;
    }

    function updateMessage(container, id, newText, sender) {
        const messageDiv = document.getElementById(id);
        if (messageDiv) {
            messageDiv.textContent = newText;
            messageDiv.className = `message ${sender}-message`;
            messageDiv.id = '';
        }
        container.scrollTop = container.scrollHeight;
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => alert('Link copied to clipboard!'))
            .catch(() => console.error('Failed to copy text'));
    }

    function updateUrl(query) {
        window.history.pushState({}, '', query ? `${window.location.pathname}${query}` : window.location.pathname);
    }
});
