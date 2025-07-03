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
from firebase_admin import auth # Para la autenticación (aunque no lo usaremos directamente para UID local)


app = Flask(__name__)

# --- Configuración de la clave secreta de la aplicación Flask ---
app.secret_key = b'g\xce\xe5\x15g\xc6\x19\xda\xd5\xc1\x14\x9a-\x83\xe8\xc1\xd5`\x0b\xa3\xebw\x1d\x9f'

# --- Inicialización de Firebase Firestore ---
# PARA DESARROLLO LOCAL:
# Necesitas un archivo de credenciales de cuenta de servicio de Firebase.
# 1. Ve a la Consola de Firebase -> Configuración del proyecto (engranaje) -> Cuentas de servicio.
# 2. Haz clic en "Generar nueva clave privada" y descarga el archivo JSON.
# 3. Coloca este archivo JSON en la MISMA CARPETA que tu app.py.

# --- ¡IMPORTANTE! Reemplaza 'nombre-de-tu-archivo-de-credenciales.json' con el nombre EXACTO de tu archivo JSON ---
# Ejemplo: service_account_key_path = 'my-project-id-firebase-adminsdk-xxxxx-xxxxxxxxxx.json'
service_account_key_path = 'nombre-de-tu-archivo-de-credenciales.json' 

# Inicializa Firebase Admin SDK si aún no se ha hecho
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(service_account_key_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK inicializado con credenciales locales.")
    except Exception as e:
        print(f"ERROR: No se pudo inicializar Firebase Admin SDK con credenciales locales: {e}")
        print("Asegúrate de que el archivo de credenciales JSON esté en la ruta correcta y sea válido.")
        print(f"El archivo esperado es: {service_account_key_path}") # Añadido para mayor claridad
        # Si no se puede inicializar, salimos o manejamos el error para evitar más fallos.
        exit(1) # Salir si la inicialización falla

# Obtiene una instancia del cliente de Firestore
db = firestore.client()

# --- Autenticación de Firebase (para acceder a Firestore) ---
# Para desarrollo local, simulamos un user_id.
# En el entorno de Canvas, __app_id y __initial_auth_token se usarían para obtener el UID real.
def get_current_user_id():
    # En un entorno de producción real o con autenticación de usuario,
    # obtendrías el UID del usuario autenticado.
    # Para desarrollo local sin autenticación, generamos un UID simple.
    return "local_dev_user_123" # Puedes cambiar esto o hacerlo más dinámico si quieres

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

        # Obtener el ID de usuario (simulado para desarrollo local)
        user_id = get_current_user_id()

        # Crear un diccionario con los datos del formulario
        contact_data = {
            'name': name,
            'email': email,
            'message': message_text,
            'timestamp': firestore.SERVER_TIMESTAMP # Guarda la fecha y hora del servidor de Firestore
        }

        try:
            # Guardar los datos en Firestore
            # La ruta de la colección se ajusta para desarrollo local.
            # En el entorno de Canvas, usaríamos artifacts/{app_id}/users/{user_id}/...
            # Aquí, creamos una colección simple en la raíz para facilitar la depuración local.
            # Puedes cambiar 'mensajes_contacto_local' a cualquier nombre que desees.
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

