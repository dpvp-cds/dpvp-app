// api/get-reportes.js
// Forzando la actualización - 5:55 PM

import { db } from './lib/firebaseAdmin.js';
// ... el resto del código sigue igual ...
import { db } from './lib/firebaseAdmin.js';

export default async function handler(request, response) {
  try {
    const reportsRef = db.collection('reportes');
    const snapshot = await reportsRef.orderBy('fecha', 'desc').get();

    if (snapshot.empty) {
      return response.status(200).json([]);
    }

    const reportes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Creamos el objeto explícitamente para asegurar que los campos viajen.
      // Esta es la corrección clave.
      reportes.push({
        id: doc.id,
        fecha: data.fecha,
        nombre1: data.nombre1,
        nombre2: data.nombre2
      });
    });

    return response.status(200).json(reportes);
    
  } catch (error) {
    console.error('Error al obtener los reportes:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}

