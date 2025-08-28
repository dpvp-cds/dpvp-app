// api/get-reportes.js

import { db } from './lib/firebaseAdmin.js';

export default async function handler(request, response) {
  try {
    const reportsRef = db.collection('reportes');
    // Ordenamos por fecha para que los más nuevos salgan primero
    const snapshot = await reportsRef.orderBy('fecha', 'desc').get();

    if (snapshot.empty) {
      // Si no hay documentos, devolvemos un array vacío
      return response.status(200).json([]);
    }

    const reportes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Lógica a prueba de fallos:
      // Si un campo no existe en el documento, le asignamos un valor por defecto.
      // Esto evita que la función se rompa con registros antiguos.
      reportes.push({
        id: doc.id,
        fecha: data.fecha || new Date().toISOString(), // Si no hay fecha, pone la de hoy
        nombre1: data.nombre1 || 'N/A', // Si no hay nombre1, pone N/A
        nombre2: data.nombre2 || 'N/A'  // Si no hay nombre2, pone N/A
      });
    });

    // Devolvemos la lista de reportes ya procesada
    return response.status(200).json(reportes);
    
  } catch (error) {
    // Si ocurre un error grave, lo registramos y devolvemos un error 500
    console.error('Error al obtener los reportes:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
