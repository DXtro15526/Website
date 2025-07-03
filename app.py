# app.py

# Importa los módulos necesarios de Flask
from flask import Flask, render_template, request, redirect, url_for, flash
import os
import json # Necesario para parsear la configuración de Firebase
from datetime import datetime # Para añadir la fecha y hora al mensaje

# Importa los módulos de Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from firebase_admin import auth # Para la autenticación


app = Flask(__name__)

# --- Configuración de la clave secreta de la aplicación Flask ---
app.secret_key = b'g\xce\xe5\x15g\xc6\x19\xda\xd5\xc1\x14\x9a-\x83\xe8\xc1\xd5`\x0b\xa3\xebw\x1d\x9f'

# --- Inicialización de Firebase Firestore ---
# Las variables __app_id, __firebase_config, __initial_auth_token son proporcionadas por el entorno Canvas.
# Si estas variables no existen (ej. en desarrollo local), usaremos un archivo de credenciales local.
app_id = os.environ.get('__app_id', 'default-app-id') # 'default-app-id' para desarrollo local
firebase_config_str = os.environ.get('__firebase_config', None) # None si no está en el entorno Canvas
initial_auth_token = os.environ.get('__initial_auth_token', None)

# --- DEBUGGING: Imprimir el valor de la variable de entorno ---
print(f"DEBUG: Valor de firebase_config_str (desde os.environ): {firebase_config_str}")
if firebase_config_str:
    print("DEBUG: firebase_config_str NO es None o vacío. Intentando cargar JSON.")
else:
    print("DEBUG: firebase_config_str ES None o vacío. Intentando cargar archivo local.")
# --- FIN DEBUGGING ---

# Inicializa Firebase Admin SDK si aún no se ha hecho
if not firebase_admin._apps:
    try:
        if firebase_config_str:
            # Si estamos en el entorno Canvas (o similar), usamos las variables de entorno
            firebase_config = json.loads(firebase_config_str)
            cred = credentials.Certificate(firebase_config)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK inicializado con credenciales del entorno Canvas.")
        else:
            # PARA DESARROLLO LOCAL (o si la variable de entorno no se carga correctamente en Render):
            # Necesitas un archivo de credenciales de cuenta de servicio de Firebase.
            # 1. Ve a la Consola de Firebase -> Configuración del proyecto (engranaje) -> Cuentas de servicio.
            # 2. Haz clic en "Generar nueva clave privada" y descarga el archivo JSON.
            # 3. Coloca este archivo JSON en la MISMA CARPETA que tu app.py.
            # 4. ASEGÚRATE de que este archivo JSON esté en tu .gitignore para NO subirlo a GitHub.

            # --- ¡IMPORTANTE! Reemplaza 'nombre-de-tu-archivo-de-credenciales.json' con el nombre EXACTO de tu archivo JSON ---
            # Ejemplo: service_account_key_path = 'my-project-id-firebase-adminsdk-xxxxx-xxxxxxxxxx.json'
            service_account_key_path = 'nombre-de-tu-archivo-de-credenciales.json' 
            
            cred = credentials.Certificate(service_account_key_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK inicializado con credenciales locales para desarrollo.")
    except Exception as e:
        print(f"ERROR: No se pudo inicializar Firebase Admin SDK: {e}")
        print("Asegúrate de que el archivo de credenciales JSON esté en la ruta correcta (para local) o que las variables de entorno estén configuradas (para despliegue).")
        exit(1) # Salir si la inicialización falla

# Obtiene una instancia del cliente de Firestore
db = firestore.client()

# --- Autenticación de Firebase (para acceder a Firestore) ---
def get_current_user_id():
    # En el entorno Canvas, __initial_auth_token se usaría para obtener el UID real.
    # Para desarrollo local, simulamos un user_id.
    if initial_auth_token:
        try:
            # Esto es una simulación; en un entorno real, usarías auth.verify_id_token
            # para obtener el UID del token. Para el SDK Admin, el token de servicio
            # ya autentica la aplicación. El UID aquí es para la estructura de la DB.
            return f"canvas_user_{os.urandom(16).hex()}" # Un UID para el entorno Canvas
        except Exception as e:
            print(f"Error al procesar initial_auth_token: {e}")
            return f"canvas_anon_user_{os.urandom(16).hex()}"
    else:
        return "local_dev_user_123" # UID para desarrollo local

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
            # La ruta de la colección se ajusta según si estamos en Canvas o desarrollo local
            if firebase_config_str: # Si estamos en Canvas, usamos la ruta de Canvas
                collection_path = f"artifacts/{app_id}/users/{user_id}/mensajes_contacto"
            else: # Para desarrollo local, usamos una colección simple
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

# --- Configuración para ejecutar la aplicación ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)

