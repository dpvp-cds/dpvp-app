// api/lib/firebaseAdmin.js

import admin from 'firebase-admin';

// Decodificamos las credenciales desde la variable de entorno de Vercel.
// Usamos un Buffer para manejar correctamente el formato.
const serviceAccountString = Buffer.from(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 
    'base64'
).toString('utf-8');

const serviceAccount = JSON.parse(serviceAccountString);

// Esta es la lógica clave:
// Verificamos si la app ya está inicializada. Si no, la inicializamos.
// Esto evita errores de "doble inicialización" en el entorno de Vercel.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK inicializado.');
  } catch (error) {
    console.error('Error al inicializar Firebase Admin SDK:', error);
  }
}

// Exportamos la instancia de la base de datos para que
// todas las demás funciones puedan usarla.
export const db = admin.firestore();