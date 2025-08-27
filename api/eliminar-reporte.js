// api/eliminar-reporte.js

import { db } from './lib/firebaseAdmin.js'; // Importamos nuestra conexión centralizada

export default async function handler(request, response) {
  // Permitir peticiones desde tu web en Vercel (CORS)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  
  // Solo permitimos el método DELETE para esta función
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = request.query;

  if (!id) {
    return response.status(400).json({ error: 'Falta el ID del reporte a eliminar' });
  }

  try {
    const reportRef = db.collection('reportes').doc(id);
    await reportRef.delete();

    console.log(`Reporte con ID: ${id} eliminado exitosamente.`);
    return response.status(200).json({ message: 'Reporte eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar el reporte:', error);
    return response.status(500).json({ error: 'No se pudo eliminar el reporte' });
  }
}