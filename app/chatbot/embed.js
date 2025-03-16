/**
 * AI Online Presence Manager - Chatbot Widget Embed Script
 * 
 * This script creates and injects the chatbot widget into any website.
 * It loads the necessary CSS and JavaScript resources and initializes the widget.
 */

(function() {
  // Check if script is already loaded
  if (document.getElementById('ai-chatbot-container')) {
    console.warn('AI Chatbot is already initialized on this page.');
    return;
  }

  // Get script element and extract configuration
  const scriptElement = document.getElementById('ai-chatbot');
  if (!scriptElement) {
    console.error('AI Chatbot script element not found. Make sure to include the id="ai-chatbot" attribute.');
    return;
  }

  // Extract configuration from data attributes
  const businessId = scriptElement.getAttribute('data-business-id');
  const position = scriptElement.getAttribute('data-position') || 'bottom-right';
  const accentColor = scriptElement.getAttribute('data-accent-color') || '#4299e1'; // Default blue
  const welcomeMessage = scriptElement.getAttribute('data-welcome-message') || 'Hello! How can I help you today?';

  // Validate business ID
  if (!businessId) {
    console.error('AI Chatbot requires a business ID. Add the data-business-id attribute to the script tag.');
    return;
  }

  // Get base URL from script src
  const scriptSrc = scriptElement.src;
  const baseUrl = scriptSrc.substring(0, scriptSrc.indexOf('/chatbot/embed.js'));

  // Add CSS styles
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #ai-chatbot-container {
        position: fixed;
        ${position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
        bottom: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      #ai-chatbot-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${accentColor};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: transform 0.3s ease;
      }

      #ai-chatbot-button:hover {
        transform: scale(1.05);
      }

      #ai-chatbot-button svg {
        width: 28px;
        height: 28px;
      }

      #ai-chatbot-window {
        position: absolute;
        bottom: 80px;
        ${position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
      }

      #ai-chatbot-window.open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: all;
      }

      #ai-chatbot-header {
        background-color: ${accentColor};
        color: white;
        padding: 15px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      #ai-chatbot-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 20px;
      }

      #ai-chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .ai-chatbot-message {
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 18px;
        margin-bottom: 5px;
        word-break: break-word;
      }

      .ai-chatbot-message.bot {
        background-color: #f0f0f0;
        align-self: flex-start;
        border-bottom-left-radius: 5px;
      }

      .ai-chatbot-message.user {
        background-color: ${accentColor};
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 5px;
      }

      .ai-chatbot-typing {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 10px 15px;
        background-color: #f0f0f0;
        border-radius: 18px;
        border-bottom-left-radius: 5px;
        align-self: flex-start;
        max-width: 80%;
      }

      .ai-chatbot-typing-dot {
        width: 8px;
        height: 8px;
        background-color: #888;
        border-radius: 50%;
        animation: typing-animation 1.4s infinite ease-in-out;
      }

      .ai-chatbot-typing-dot:nth-child(1) {
        animation-delay: 0s;
      }

      .ai-chatbot-typing-dot:nth-child(2) {
        animation-delay: 0.2s;
      }

      .ai-chatbot-typing-dot:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing-animation {
        0%, 60%, 100% {
          transform: translateY(0);
        }
        30% {
          transform: translateY(-5px);
        }
      }

      #ai-chatbot-input-area {
        display: flex;
        padding: 10px;
        border-top: 1px solid #e0e0e0;
        background-color: white;
      }

      #ai-chatbot-input {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid #e0e0e0;
        border-radius: 20px;
        outline: none;
        font-size: 14px;
      }

      #ai-chatbot-input:focus {
        border-color: ${accentColor};
      }

      #ai-chatbot-send {
        background-color: ${accentColor};
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        margin-left: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #ai-chatbot-send:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .ai-chatbot-feedback {
        display: flex;
        gap: 10px;
        margin-top: 5px;
        justify-content: flex-end;
      }

      .ai-chatbot-feedback button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        font-size: 12px;
        color: #666;
      }

      .ai-chatbot-feedback button:hover {
        background-color: #f0f0f0;
      }

      .ai-chatbot-feedback button.selected {
        color: ${accentColor};
        font-weight: bold;
      }

      @media (max-width: 480px) {
        #ai-chatbot-window {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          left: 0;
          border-radius: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create chat widget
  function createChatWidget() {
    // Create container
    const container = document.createElement('div');
    container.id = 'ai-chatbot-container';
    
    // Create chat button
    const button = document.createElement('div');
    button.id = 'ai-chatbot-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    
    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'ai-chatbot-window';
    
    // Create header
    const header = document.createElement('div');
    header.id = 'ai-chatbot-header';
    header.innerHTML = `
      <div>AI Assistant</div>
      <button id="ai-chatbot-close">&times;</button>
    `;
    
    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'ai-chatbot-messages';
    
    // Create input area
    const inputArea = document.createElement('div');
    inputArea.id = 'ai-chatbot-input-area';
    inputArea.innerHTML = `
      <input type="text" id="ai-chatbot-input" placeholder="Type your message...">
      <button id="ai-chatbot-send" disabled>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    `;
    
    // Assemble the widget
    chatWindow.appendChild(header);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputArea);
    container.appendChild(button);
    container.appendChild(chatWindow);
    document.body.appendChild(container);
    
    return {
      container,
      button,
      chatWindow,
      messagesContainer,
      inputArea,
      input: inputArea.querySelector('#ai-chatbot-input'),
      sendButton: inputArea.querySelector('#ai-chatbot-send'),
      closeButton: header.querySelector('#ai-chatbot-close')
    };
  }

  // Initialize the chat widget
  function initChatWidget() {
    // Add styles
    addStyles();
    
    // Create widget elements
    const elements = createChatWidget();
    
    // Generate a session ID
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Track if the chat window is open
    let isOpen = false;
    
    // Track the last message ID for feedback
    let lastMessageId = null;
    
    // Toggle chat window
    elements.button.addEventListener('click', () => {
      isOpen = !isOpen;
      elements.chatWindow.classList.toggle('open', isOpen);
      
      // If opening for the first time, show welcome message
      if (isOpen && elements.messagesContainer.children.length === 0) {
        addBotMessage(welcomeMessage);
      }
      
      // Focus input when opening
      if (isOpen) {
        elements.input.focus();
      }
    });
    
    // Close chat window
    elements.closeButton.addEventListener('click', () => {
      isOpen = false;
      elements.chatWindow.classList.remove('open');
    });
    
    // Enable/disable send button based on input
    elements.input.addEventListener('input', () => {
      elements.sendButton.disabled = elements.input.value.trim() === '';
    });
    
    // Send message on button click
    elements.sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && elements.input.value.trim() !== '') {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Function to add a user message to the chat
    function addUserMessage(text) {
      const messageElement = document.createElement('div');
      messageElement.className = 'ai-chatbot-message user';
      messageElement.textContent = text;
      elements.messagesContainer.appendChild(messageElement);
      elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
    
    // Function to add a bot message to the chat
    function addBotMessage(text, messageId = null) {
      const messageElement = document.createElement('div');
      messageElement.className = 'ai-chatbot-message bot';
      messageElement.textContent = text;
      
      // Add feedback buttons if message ID is provided
      if (messageId) {
        lastMessageId = messageId;
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'ai-chatbot-feedback';
        feedbackElement.innerHTML = `
          <button class="ai-chatbot-thumbs-up" aria-label="Helpful">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            Helpful
          </button>
          <button class="ai-chatbot-thumbs-down" aria-label="Not helpful">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
            </svg>
            Not helpful
          </button>
        `;
        
        // Add feedback event listeners
        const thumbsUp = feedbackElement.querySelector('.ai-chatbot-thumbs-up');
        const thumbsDown = feedbackElement.querySelector('.ai-chatbot-thumbs-down');
        
        thumbsUp.addEventListener('click', () => {
          sendFeedback(messageId, true);
          thumbsUp.classList.add('selected');
          thumbsDown.disabled = true;
        });
        
        thumbsDown.addEventListener('click', () => {
          sendFeedback(messageId, false);
          thumbsDown.classList.add('selected');
          thumbsUp.disabled = true;
        });
        
        messageElement.appendChild(feedbackElement);
      }
      
      elements.messagesContainer.appendChild(messageElement);
      elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
    
    // Function to show typing indicator
    function showTypingIndicator() {
      const typingElement = document.createElement('div');
      typingElement.className = 'ai-chatbot-typing';
      typingElement.innerHTML = `
        <div class="ai-chatbot-typing-dot"></div>
        <div class="ai-chatbot-typing-dot"></div>
        <div class="ai-chatbot-typing-dot"></div>
      `;
      typingElement.id = 'ai-chatbot-typing-indicator';
      elements.messagesContainer.appendChild(typingElement);
      elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
    
    // Function to hide typing indicator
    function hideTypingIndicator() {
      const typingElement = document.getElementById('ai-chatbot-typing-indicator');
      if (typingElement) {
        typingElement.remove();
      }
    }
    
    // Function to send a message
    function sendMessage() {
      const message = elements.input.value.trim();
      if (message === '') return;
      
      // Add user message to chat
      addUserMessage(message);
      
      // Clear input
      elements.input.value = '';
      elements.sendButton.disabled = true;
      
      // Show typing indicator
      showTypingIndicator();
      
      // Send message to server
      fetch(`${baseUrl}/api/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          sessionId,
          message
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add bot response to chat
        addBotMessage(data.response, data.logId);
      })
      .catch(error => {
        console.error('Error sending message:', error);
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add error message
        addBotMessage('Sorry, I encountered an error. Please try again later.');
      });
    }
    
    // Function to send feedback
    function sendFeedback(messageId, wasHelpful) {
      fetch(`${baseUrl}/api/chatbot/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          sessionId,
          logId: messageId,
          wasHelpful
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .catch(error => {
        console.error('Error sending feedback:', error);
      });
    }
  }

  // Initialize the chat widget
  initChatWidget();
})(); 