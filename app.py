# app.py

# Importa los módulos necesarios de Flask
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import os
import json
from datetime import datetime
import requests # Para hacer peticiones HTTP a la API de Gemini

# Importa los módulos de Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from firebase_admin import auth


app = Flask(__name__)

# --- Configuración de la clave secreta de la aplicación Flask ---
app.secret_key = b'g\xce\xe5\x15g\xc6\x19\xda\xd5\xc1\x14\x9a-\x83\xe8\xc1\xd5`\x0b\xa3\xebw\x1d\x9f'

# --- Inicialización de Firebase Firestore ---
app_id = os.environ.get('__app_id', 'default-app-id')
firebase_config_str = os.environ.get('__firebase_config', None)
initial_auth_token = os.environ.get('__initial_auth_token', None)

# --- Obtener la API Key de Gemini desde variables de entorno ---
# Esta clave DEBE ser configurada en Render como una variable de entorno.
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '') 
if not GEMINI_API_KEY:
    print("ADVERTENCIA: La variable de entorno GEMINI_API_KEY no está configurada. La API de IA no funcionará.")


# Inicializa Firebase Admin SDK si aún no se ha hecho
if not firebase_admin._apps:
    try:
        if firebase_config_str:
            firebase_config = json.loads(firebase_config_str)
            cred = credentials.Certificate(firebase_config)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK inicializado con credenciales del entorno Canvas/Render.")
        else:
            # PARA DESARROLLO LOCAL:
            service_account_key_path = 'nombre-de-tu-archivo-de-credenciales.json' 
            
            cred = credentials.Certificate(service_account_key_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK inicializado con credenciales locales para desarrollo.")
    except Exception as e:
        print(f"ERROR: No se pudo inicializar Firebase Admin SDK: {e}")
        print("Asegúrate de que el archivo de credenciales JSON esté en la ruta correcta (para local) o que las variables de entorno estén configuradas (para despliegue).")
        exit(1)

# Obtiene una instancia del cliente de Firestore
db = firestore.client()

# --- Autenticación de Firebase (para acceder a Firestore) ---
def get_current_user_id():
    if initial_auth_token:
        return f"canvas_user_{os.urandom(16).hex()}"
    else:
        return "local_dev_user_123"

# --- Ruta principal para la página web ---
@app.route('/')
def index():
    return render_template('index.html')

# --- Ruta para manejar el formulario de contacto ---
@app.route('/contact', methods=['POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        message_text = request.form.get('message')

        user_id = get_current_user_id()

        contact_data = {
            'name': name,
            'email': email,
            'message': message_text,
            'timestamp': firestore.SERVER_TIMESTAMP
        }

        try:
            if firebase_config_str:
                collection_path = f"artifacts/{app_id}/users/{user_id}/mensajes_contacto"
            else:
                collection_path = f"mensajes_contacto_local/{user_id}/mensajes"
            
            doc_ref = db.collection(collection_path).add(contact_data)
            
            print(f"\n--- Mensaje de contacto guardado en Firestore ---")
            print(f"ID de Documento: {doc_ref[1].id}")
            print(f"Colección: {collection_path}")
            print(f"Datos: {contact_data}")
            print("--------------------------------------------------\n")

            flash('¡Gracias por tu mensaje! Ha sido guardado.', 'success')

        except Exception as e:
            print(f"Error al guardar mensaje en Firestore: {e}")
            flash('Hubo un error al guardar tu mensaje. Por favor, inténtalo de nuevo más tarde.', 'error')

        return redirect(url_for('index') + '#contact')
    else:
        return redirect(url_for('index'))

# --- NUEVA RUTA: Endpoint para la API de Chat con Gemini ---
@app.route('/api/chat', methods=['POST'])
def chat_api():
    if not GEMINI_API_KEY:
        return jsonify({"error": "API Key de Gemini no configurada en el servidor."}), 500

    data = request.get_json()
    user_message = data.get('message')

    if not user_message:
        return jsonify({"error": "No se proporcionó ningún mensaje."}), 400

    try:
        chat_history = []
        chat_history.append({"role": "user", "parts": [{"text": user_message}]})

        payload = {
            "contents": chat_history
        }

        gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        
        headers = {
            'Content-Type': 'application/json'
        }

        response = requests.post(gemini_api_url, headers=headers, json=payload)
        response.raise_for_status() # Lanza una excepción para códigos de estado de error (4xx o 5xx)
        
        gemini_result = response.json()

        if gemini_result.get('candidates') and len(gemini_result['candidates']) > 0 and \
           gemini_result['candidates'][0].get('content') and \
           gemini_result['candidates'][0]['content'].get('parts') and \
           len(gemini_result['candidates'][0]['content']['parts']) > 0:
            ai_response = gemini_result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"response": ai_response})
        else:
            print(f"Respuesta inesperada de Gemini: {gemini_result}")
            return jsonify({"error": "Lo siento, no pude generar una respuesta de la IA."}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error en la petición a la API de Gemini: {e}")
        return jsonify({"error": f"Error de conexión con la IA: {str(e)}"}), 500
    except Exception as e:
        print(f"Error inesperado al procesar la API de Gemini: {e}")
        return jsonify({"error": f"Error interno del servidor al procesar la IA: {str(e)}"}), 500


# --- Configuración para ejecutar la aplicación ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)

