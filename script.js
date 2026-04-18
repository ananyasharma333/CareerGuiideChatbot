// =============================================
//  AI Career Guidance Chatbot – script.js
//  Connected to Flask Backend with Preferences
//  + Conversation History + Suggestion Chips
// =============================================

const chatMessages = document.getElementById('chatMessages');
const userInput    = document.getElementById('userInput');
const sendBtn      = document.getElementById('sendBtn');

// Flask backend URL
const API_URL = 'http://127.0.0.1:5000/chat';

// ── State: preferences + conversation history ──
let userPreferences = {};
let conversationHistory = [];

// ── DOM refs for preference UI ─────────────────
const preferenceOverlay = document.getElementById('preferenceOverlay');
const preferenceForm    = document.getElementById('preferenceForm');
const prefSkip          = document.getElementById('prefSkip');
const editPrefsBtn      = document.getElementById('editPrefsBtn');
const clearChatBtn      = document.getElementById('clearChatBtn');
const prefBadge         = document.getElementById('prefBadge');
const prefBadgeText     = document.getElementById('prefBadgeText');
const suggestionChips   = document.getElementById('suggestionChips');
const chatWrapper       = document.getElementById('chatWrapper');

// Set welcome message timestamp
document.getElementById('welcome-time').textContent = getTime();


// ═══════════════════════════════════════════════
//  PREFERENCE MANAGEMENT
// ═══════════════════════════════════════════════

// Load saved preferences from localStorage
function loadPreferences() {
  const saved = localStorage.getItem('careerbot_preferences');
  if (saved) {
    try {
      userPreferences = JSON.parse(saved);
      applyPreferences();
      hidePreferenceOverlay();
    } catch { /* ignore parse errors */ }
  }
}

// Save preferences to localStorage
function savePreferences(prefs) {
  userPreferences = prefs;
  localStorage.setItem('careerbot_preferences', JSON.stringify(prefs));
  applyPreferences();
}

// Apply preferences to UI (badge + personalised welcome)
function applyPreferences() {
  const parts = [];
  if (userPreferences.education) parts.push(userPreferences.education);
  if (userPreferences.domain)    parts.push(userPreferences.domain);
  if (userPreferences.interests) parts.push(userPreferences.interests);

  if (parts.length > 0) {
    prefBadge.style.display = 'flex';
    prefBadgeText.textContent = `🎯 ${userPreferences.name || 'You'} · ${parts.join(' · ')}`;
  }

  // Update welcome message
  const welcomeMsg = document.querySelector('#welcome-msg .bot-bubble p');
  if (welcomeMsg && userPreferences.name) {
    welcomeMsg.innerHTML =
      `👋 Hello, <strong>${userPreferences.name}</strong>! I'm your <strong>AI Career Assistant</strong> ` +
      `specialised for <strong>${userPreferences.domain || 'your career goals'}</strong>. ` +
      `Ask me anything — I'll tailor my advice to your background!`;
  }
}

// Show preference overlay
function showPreferenceOverlay() {
  preferenceOverlay.classList.remove('hidden');
  preferenceOverlay.classList.add('visible');

  // Pre-fill form if prefs exist
  if (userPreferences.name)      document.getElementById('prefName').value      = userPreferences.name;
  if (userPreferences.education) document.getElementById('prefEducation').value = userPreferences.education;
  if (userPreferences.interests) document.getElementById('prefInterests').value = userPreferences.interests;
  if (userPreferences.domain)    document.getElementById('prefDomain').value    = userPreferences.domain;
}

// Hide preference overlay
function hidePreferenceOverlay() {
  preferenceOverlay.classList.add('hidden');
  preferenceOverlay.classList.remove('visible');
}

// Handle form submission
preferenceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const prefs = {
    name:      document.getElementById('prefName').value.trim(),
    education: document.getElementById('prefEducation').value,
    interests: document.getElementById('prefInterests').value.trim(),
    domain:    document.getElementById('prefDomain').value
  };
  savePreferences(prefs);
  hidePreferenceOverlay();
  userInput.focus();

  // Show personalised greeting as a bot message
  if (prefs.name) {
    const greet = `Great to meet you, ${prefs.name}! I'll personalise all my advice for ` +
      `${prefs.domain || 'your career goals'}. Go ahead and ask me anything! 🚀`;
    chatMessages.appendChild(createMessage(greet, 'bot'));
    scrollToBottom();
  }
});

// Skip button
prefSkip.addEventListener('click', () => {
  hidePreferenceOverlay();
  userInput.focus();
});

// Edit preferences button in header
editPrefsBtn.addEventListener('click', () => {
  showPreferenceOverlay();
});

// Clear Chat button
clearChatBtn.addEventListener('click', () => {
  // Reset conversation array
  conversationHistory = [];
  
  // Reset chat HTML to just the welcome message
  chatMessages.innerHTML = `
    <div class="message bot-message" id="welcome-msg">
      <div class="avatar bot-avatar" aria-label="Bot">🤖</div>
      <div class="bubble bot-bubble">
        <p>👋 Hello! I'm your <strong>AI Career Assistant</strong>. Ask me anything about career paths, resume tips, interview strategies, or job searching. I'm here to help!</p>
        <span class="timestamp" id="welcome-time">${getTime()}</span>
      </div>
    </div>
  `;
  
  // Re-show chips
  if (suggestionChips) {
    suggestionChips.style.display = 'flex';
  }
  
  // Re-apply preferences if user had set any (updates welcome message)
  applyPreferences();
});

// ═══════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}


// ═══════════════════════════════════════════════
//  MESSAGE RENDERING
// ═══════════════════════════════════════════════

function createMessage(text, sender) {
  const isUser = sender === 'user';

  const row = document.createElement('div');
  row.classList.add('message', isUser ? 'user-message' : 'bot-message');

  const avatar = document.createElement('div');
  avatar.classList.add('avatar', isUser ? 'user-avatar' : 'bot-avatar');
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = isUser
    ? (userPreferences.name ? userPreferences.name.charAt(0).toUpperCase() : 'You')
    : '🤖';

  const bubble = document.createElement('div');
  bubble.classList.add('bubble', isUser ? 'user-bubble' : 'bot-bubble');

  const para = document.createElement('p');
  // Support markdown-style bold (**text**)
  para.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const time = document.createElement('span');
  time.classList.add('timestamp');
  time.textContent = getTime();

  bubble.appendChild(para);
  bubble.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(bubble);

  return row;
}


// ═══════════════════════════════════════════════
//  TYPING INDICATOR
// ═══════════════════════════════════════════════

function showTypingIndicator() {
  const row = document.createElement('div');
  row.classList.add('message', 'bot-message');
  row.id = 'typingRow';

  const avatar = document.createElement('div');
  avatar.classList.add('avatar', 'bot-avatar');
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = '🤖';

  const bubble = document.createElement('div');
  bubble.classList.add('bubble', 'bot-bubble', 'typing-indicator');
  bubble.setAttribute('aria-label', 'Bot is typing');
  bubble.innerHTML = '<span class="typing-text">Bot is typing</span><div class="dots"><span></span><span></span><span></span></div>';

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const typingRow = document.getElementById('typingRow');
  if (typingRow) typingRow.remove();
}


// ═══════════════════════════════════════════════
//  SEND MESSAGE (with preferences + history)
// ═══════════════════════════════════════════════

async function sendMessage(overrideText) {
  const text = overrideText || userInput.value.trim();
  if (!text) return;

  // Hide suggestion chips after first message
  if (suggestionChips) {
    suggestionChips.style.display = 'none';
  }

  // 1. Display user message immediately
  chatMessages.appendChild(createMessage(text, 'user'));
  scrollToBottom();

  // 2. Clear input & disable send button
  userInput.value = '';
  sendBtn.disabled = true;

  // 3. Add to conversation history
  conversationHistory.push({ role: 'user', content: text });

  // 4. Show typing indicator
  showTypingIndicator();

  try {
    // 5. POST to Flask backend with preferences + history
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:     text,
        preferences: userPreferences,
        history:     conversationHistory
      })
    });

    const data = await response.json();
    removeTypingIndicator();

    const botReply = data.reply || data.error || "Sorry, I couldn't understand that.";
    chatMessages.appendChild(createMessage(botReply, 'bot'));

    // 6. Add bot reply to history
    conversationHistory.push({ role: 'assistant', content: botReply });

  } catch (error) {
    removeTypingIndicator();
    chatMessages.appendChild(
      createMessage("⚠️ Could not connect to the server. Make sure the Flask backend is running at http://127.0.0.1:5000", 'bot')
    );
    console.error('Error connecting to Flask backend:', error);
  }

  scrollToBottom();
  sendBtn.disabled = false;
  userInput.focus();
}


// ═══════════════════════════════════════════════
//  SUGGESTION CHIPS
// ═══════════════════════════════════════════════

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const query = chip.getAttribute('data-query');
    sendMessage(query);
  });
});


// ═══════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════

sendBtn.addEventListener('click', () => sendMessage());

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-focus on load + load prefs
window.addEventListener('load', () => {
  loadPreferences();
  if (!localStorage.getItem('careerbot_preferences')) {
    showPreferenceOverlay();
  }
  userInput.focus();
});
