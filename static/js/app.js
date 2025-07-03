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
            // Opcional: Ocultar mensajes después de un tiempo
            setTimeout(() => {
                flashMessagesContainer.style.display = 'none';
            }, 5000); // Ocultar después de 5 segundos
        }
    }

    // Llama a la función al cargar la página
    showFlashMessages();

    // --- Funcionalidad de auto-ajuste del textarea ---
    function autoResizeTextarea() {
        userInput.style.height = 'auto'; // Restablece la altura para calcular la nueva
        userInput.style.height = userInput.scrollHeight + 'px'; // Ajusta a la altura del contenido
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
            messageContainer.classList.add('user-message'); // Añadir clase específica de usuario
        } else {
            messageContainer.classList.add('ai-message-container');
            messageContainer.classList.add('ai-message'); // Añadir clase específica de IA
        }

        messageContainer.appendChild(chatBubble);
        messageContainer.appendChild(timestamp);
        chatOutput.appendChild(messageContainer);

        // Desplazar al final del chat
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    // --- Función para enviar mensaje a la IA ---
    async function sendMessageToAI() {
        const message = userInput.value.trim();
        if (message === '') return; // No enviar mensajes vacíos

        addMessage('user', message); // Añadir mensaje del usuario al chat
        userInput.value = ''; // Limpiar el input
        autoResizeTextarea(); // Ajustar el tamaño del textarea

        loadingIndicator.style.display = 'flex'; // Mostrar indicador de carga
        sendButton.disabled = true; // Deshabilitar botón de enviar

        try {
            // Llama a la API de Gemini para generar contenido
            // NOTA: En un entorno real, esta llamada API se haría a tu backend Flask,
            // y tu backend Flask llamaría a la API de Gemini de forma segura.
            // Para este ejemplo, simulamos la llamada directa para probar la UI.
            // Si tu Flask ya tiene un endpoint para la IA, deberías llamarlo aquí.

            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: message }] });

            const payload = { contents: chatHistory };
            const apiKey = ""; // Canvas proporcionará esto en tiempo de ejecución.
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const aiResponse = result.candidates[0].content.parts[0].text;
                addMessage('ai', aiResponse); // Añadir respuesta de la IA
            } else {
                addMessage('ai', 'Lo siento, no pude generar una respuesta. Inténtalo de nuevo.');
                console.error('Estructura de respuesta inesperada de la API de Gemini:', result);
            }

        } catch (error) {
            console.error('Error al comunicarse con la IA:', error);
            addMessage('ai', 'Hubo un error al conectar con la IA. Por favor, revisa tu conexión.');
        } finally {
            loadingIndicator.style.display = 'none'; // Ocultar indicador de carga
            sendButton.disabled = false; // Habilitar botón de enviar
            userInput.focus(); // Volver a enfocar el input
        }
    }

    // --- Event Listeners para el botón de enviar ---
    // Para clics (escritorio)
    sendButton.addEventListener('click', sendMessageToAI);

    // Para toques (móvil) - touchstart para una respuesta más rápida en móviles
    sendButton.addEventListener('touchstart', function(event) {
        event.preventDefault(); // Previene el comportamiento predeterminado del toque (ej. zoom)
        sendMessageToAI();
    }, { passive: false }); // Usar { passive: false } para permitir preventDefault

    // También permitir enviar con la tecla Enter en el input de texto
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) { // Enter sin Shift
            event.preventDefault(); // Prevenir salto de línea
            sendMessageToAI();
        }
    });

    // --- Funcionalidad del acordeón para FAQ ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const accordionItem = header.parentElement;
            const accordionContent = header.nextElementSibling;

            // Cierra todos los demás acordeones
            accordionHeaders.forEach(otherHeader => {
                const otherItem = otherHeader.parentElement;
                const otherContent = otherHeader.nextElementSibling;
                if (otherItem !== accordionItem && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherContent.style.maxHeight = null;
                    otherHeader.classList.remove('active');
                }
            });

            // Abre o cierra el acordeón actual
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
        if (window.scrollY > 50) { // Ajusta este valor según cuándo quieres que se haga sticky
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});
