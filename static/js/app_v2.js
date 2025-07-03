// static/js/app.js

document.addEventListener('DOMContentLoaded', function() {
    const chatOutput = document.getElementById('chat-output');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const flashMessagesContainer = document.querySelector('.flash-messages');

    // --- Función para mostrar mensajes flash de Flask (si existen) ---
    function showFlashMessages() {
        if (flashMessagesContainer) {
            flashMessagesContainer.style.display = 'block';
            setTimeout(() => {
                flashMessagesContainer.style.display = 'none';
            }, 5000);
        }
    }

    showFlashMessages();

    // --- Funcionalidad de auto-ajuste del textarea ---
    function autoResizeTextarea() {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    }

    userInput.addEventListener('input', autoResizeTextarea);

    // --- Función para añadir un mensaje al chat ---
    function addMessage(sender, text) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container');

        const chatBubble = document.createElement('div');
        chatBubble.classList.add('chat-bubble');
        chatBubble.textContent = text;

        const timestamp = document.createElement('span');
        timestamp.classList.add('message-timestamp');
        const now = new Date();
        timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (sender === 'user') {
            messageContainer.classList.add('user-message-container');
            messageContainer.classList.add('user-message');
        } else {
            messageContainer.classList.add('ai-message-container');
            messageContainer.classList.add('ai-message');
        }

        messageContainer.appendChild(chatBubble);
        messageContainer.appendChild(timestamp);
        chatOutput.appendChild(messageContainer);

        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    // --- Función para enviar mensaje a la IA (a través de Flask) ---
    async function sendMessageToAI() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = '';
        autoResizeTextarea();

        loadingIndicator.style.display = 'flex';
        sendButton.disabled = true;

        try {
            // Llama a tu endpoint Flask para la IA
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            if (response.ok) { // Si la respuesta HTTP es 200 OK
                addMessage('ai', data.response);
            } else { // Si hay un error del servidor Flask
                addMessage('ai', data.error || 'Lo siento, hubo un error al comunicarse con la IA.');
                console.error('Error del servidor Flask:', data.error);
            }

        } catch (error) {
            console.error('Error al comunicarse con el backend Flask:', error);
            addMessage('ai', 'Hubo un error de red al conectar con el servidor. Por favor, revisa tu conexión.');
        } finally {
            loadingIndicator.style.display = 'none';
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    // --- Event Listeners para el botón de enviar ---
    sendButton.addEventListener('click', sendMessageToAI);
    sendButton.addEventListener('touchstart', function(event) {
        event.preventDefault();
        sendMessageToAI();
    }, { passive: false });

    // También permitir enviar con la tecla Enter en el input de texto
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessageToAI();
        }
    });

    // --- Funcionalidad del acordeón para FAQ ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const accordionItem = header.parentElement;
            const accordionContent = header.nextElementSibling;

            accordionHeaders.forEach(otherHeader => {
                const otherItem = otherHeader.parentElement;
                const otherContent = otherHeader.nextElementSibling;
                if (otherItem !== accordionItem && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherContent.style.maxHeight = null;
                    otherHeader.classList.remove('active');
                }
            });

            accordionItem.classList.toggle('active');
            header.classList.toggle('active');
            if (accordionItem.classList.contains('active')) {
                accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
            } else {
                accordionContent.style.maxHeight = null;
            }
        });
    });

    // --- Funcionalidad de Sticky Header ---
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});
