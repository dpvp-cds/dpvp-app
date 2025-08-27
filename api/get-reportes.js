// api/get-reporte.js

import { db } from './lib/firebaseAdmin.js'; // Importamos nuestra conexión centralizada

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = request.query;

  if (!id) {
    return response.status(400).json({ error: 'Falta el ID del reporte' });
  }

  try {
    const reportRef = db.collection('reportes').doc(id);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return response.status(404).json({ error: 'Reporte no encontrado' });
    }

    return response.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error al obtener el reporte:', error);
    return response.status(500).json({ error: 'No se pudo obtener el reporte' });
  }
}
