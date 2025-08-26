// api/lib/firebaseAdmin.js

import admin from 'firebase-admin';

// Esta es la lógica de inicialización robusta.
// El bloque try...catch es la clave.
try {
  const serviceAccountString = Buffer.from(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    'base64'
  ).toString('utf-8');

  const serviceAccount = JSON.parse(serviceAccountString);

  // Intenta inicializar la aplicación.
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK inicializado.');

} catch (error) {
  // Si la inicialización falla porque la app ya existe,
  // simplemente ignoramos el error, porque significa que ya está lista para usar.
  // Nos aseguramos de que no sea otro tipo de error.
  if (!/already exists/i.test(error.message)) {
    console.error('Error de inicialización de Firebase:', error.stack);
  }
}

// Exportamos la instancia de la base de datos para que
// todas las demás funciones puedan usarla sin problemas.
export const db = admin.firestore();
