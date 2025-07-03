document.addEventListener('DOMContentLoaded', () => {
    // --- Configuración de la API de Gemini (solo para uso personal y local) ---
    // ¡ADVERTENCIA: NO USES ESTO EN UN SITIO WEB PÚBLICO! TU CLAVE SERÁ VISIBLE.
    const GEMINI_API_KEY = "AIzaSyChkgbU9NSdHzweR44oa7OwBq4YEyIrcpM"; // Tu clave API
    const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    // --- Elementos del DOM ---
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatOutput = document.getElementById('chat-output');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- Smooth Scrolling para la navegación ---
    document.querySelectorAll('nav a[href^="#"], .cta-button[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // --- Lógica del Acordeón para FAQ ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const currentContent = header.nextElementSibling;
            const currentActive = document.querySelector('.accordion-header.active');

            if (currentActive && currentActive !== header) {
                currentActive.classList.remove('active');
                currentActive.nextElementSibling.style.maxHeight = null;
                currentActive.nextElementSibling.style.padding = '0 25px';
            }

            header.classList.toggle('active');
            if (header.classList.contains('active')) {
                currentContent.style.maxHeight = currentContent.scrollHeight + 'px';
                currentContent.style.padding = '0 25px 20px 25px';
            } else {
                currentContent.style.maxHeight = null;
                currentContent.style.padding = '0 25px';
            }
        });
    });

// --- Lógica de la Barra de Navegación "Burbuja" ---
    const header = document.querySelector('header');
    const heroSection = document.getElementById('hero');
    let heroHeight = heroSection.offsetHeight; // Obtener la altura de la sección hero

    // Actualizar la altura del hero si la ventana cambia de tamaño
    window.addEventListener('resize', () => {
        heroHeight = heroSection.offsetHeight;
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > heroHeight - 50) { // Si el scroll pasa la mayor parte del hero (ajusta 50px si es necesario)
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ... (resto de tu script.js, incluyendo la lógica de la IA) ...



    // --- Lógica de Interacción con la IA ---

    // Función para agregar un mensaje al chat
    function appendMessage(text, type) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container');
        messageContainer.classList.add(`${type}-container`); // user-message-container o ai-message-container

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('chat-bubble');
        messageBubble.classList.add(type); // user-message o ai-message
        // Para permitir que la IA devuelva HTML simple como saltos de línea y formateo básico
        messageBubble.innerHTML = formatAIResponse(text);

        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('message-timestamp');
        timestampDiv.textContent = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

        messageContainer.appendChild(messageBubble);
        messageContainer.appendChild(timestampDiv); // Agrega el timestamp

        chatOutput.appendChild(messageContainer);
        chatOutput.scrollTop = chatOutput.scrollHeight; // Auto-scroll al final
    }

    // Formateo básico para la respuesta de la IA (puedes expandirlo)
    function formatAIResponse(text) {
        // Reemplaza saltos de línea con <br>
        text = text.replace(/\n/g, '<br>');
        // Opcional: Podrías añadir más formateo Markdown si el modelo lo devuelve
        // Por ejemplo, **texto** -> <strong>texto</strong>
        // o `codigo` -> <code>codigo</code>
        return text;
    }

    // Función principal para enviar el mensaje
    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        // Deshabilitar input y botón de enviar mientras se procesa
        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; // Spinner en el botón

        // Mostrar mensaje del usuario
        appendMessage(message, 'user-message');
        userInput.value = ''; // Limpiar input

        // Mostrar indicador de carga "Procesando..."
        loadingIndicator.style.display = 'flex';
        chatOutput.scrollTop = chatOutput.scrollHeight;

        try {
            const response = await fetch(`${API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: message
                                }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                // Intenta parsear el error para dar un mensaje más específico
                let errorDetails = `Error HTTP: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error && errorData.error.message) {
                        errorDetails = errorData.error.message;
                    }
                } catch (jsonError) {
                    // Si no se puede parsear como JSON, usa el estado HTTP
                    console.error('Error al parsear la respuesta de error:', jsonError);
                }
                throw new Error(errorDetails);
            }

            const data = await response.json();
            let aiResponse = "Lo siento, no pude generar una respuesta clara.";

            // Verificar si hay candidatos de respuesta y extraer el texto
            if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                aiResponse = data.candidates[0].content.parts[0].text;
            } else if (data && data.promptFeedback && data.promptFeedback.blockReason) {
                // Manejo de casos de bloqueo de contenido (seguridad)
                aiResponse = `Lo siento, tu solicitud fue bloqueada por la IA debido a políticas de seguridad (${data.promptFeedback.blockReason}). Por favor, intenta reformular tu pregunta.`;
            } else {
                // Caso para otras respuestas inesperadas
                aiResponse = "La IA no proporcionó una respuesta esperada. Intenta de nuevo.";
                console.warn("Respuesta inesperada de la API:", data);
            }

            // Mostrar respuesta de la IA
            appendMessage(aiResponse, 'ai-message');

        } catch (error) {
            console.error('Error al comunicarse con la IA:', error);
            appendMessage(`Lo siento, hubo un error al procesar tu solicitud. Por favor, asegúrate de que tu clave API sea válida, que tengas conexión a internet y que tu pregunta no infrinja las políticas de uso. Detalles: ${error.message}`, 'ai-message');
        } finally {
            // Ocultar indicador de carga
            loadingIndicator.style.display = 'none';
            // Re-habilitar input y botón de enviar
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.innerHTML = 'Enviar <i class="fas fa-paper-plane"></i>';
            userInput.focus(); // Vuelve a enfocar el input
            chatOutput.scrollTop = chatOutput.scrollHeight; // Asegurarse de que el scroll esté al final
        }
    }

    // Ajustar la altura del textarea dinámicamente
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto'; // Restablece la altura para calcular la nueva
        userInput.style.height = userInput.scrollHeight + 'px'; // Ajusta a la altura del contenido
    });

    // Permite enviar mensaje con Enter, pero Shift+Enter para nueva línea
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });


    // Añadir mensaje de bienvenida al cargar
    appendMessage('¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?', 'ai-message welcome');
});