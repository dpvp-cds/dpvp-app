// api/get-reportes.js

import { db } from './lib/firebaseAdmin.js'; // Importamos nuestra conexión centralizada

export default async function handler(request, response) {
  try {
    const reportsRef = db.collection('reportes');
    const snapshot = await reportsRef.orderBy('fecha', 'desc').get();

    if (snapshot.empty) {
      return response.status(200).json([]);
    }

    const reportes = [];
    snapshot.forEach(doc => {
      reportes.push({ id: doc.id, ...doc.data() });
    });

    return response.status(200).json(reportes);
  } catch (error) {
    console.error('Error al obtener los reportes:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
