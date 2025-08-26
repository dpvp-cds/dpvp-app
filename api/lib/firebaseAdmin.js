// api/lib/firebaseAdmin.js

import admin from 'firebase-admin';

// Este es el único lugar donde se inicializa Firebase.
// Usamos un bloque try/catch para manejar el caso donde la función
// se "calienta" en Vercel y ya está inicializada.
try {
  admin.initializeApp({
    credential: admin.credential.cert(
      // Parseamos las credenciales directamente del string JSON,
      // que es el formato correcto.
      JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    ),
  });
  console.log('Firebase Admin SDK inicializado.');
} catch (error) {
  // Si el error es porque la app ya existe, lo ignoramos.
  // Es un comportamiento esperado en un entorno serverless.
  // Si es cualquier otro error, lo mostramos en el log.
  if (!/already exists/i.test(error.message)) {
    console.error('Error de inicialización de Firebase:', error.stack);
  }
}

// Exportamos la instancia de la base de datos ya lista para ser usada.
export const db = admin.firestore();
