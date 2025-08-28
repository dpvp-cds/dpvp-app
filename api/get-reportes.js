// api/get-reportes.js
import { db } from './lib/firebaseAdmin.js';

export default async function handler(request, response) {
  try {
    const reportsRef = db.collection('reportes');
    // Ordenamos por fecha para que los más nuevos salgan primero
    const snapshot = await reportsRef.orderBy('fecha', 'desc').get();
    if (snapshot.empty) {
      return response.status(200).json([]);
    }
    const reportes = [];
    snapshot.forEach(doc => {
      const data = doc.data();

      // NUEVO: Tomamos los nombres correctamente de demograficos
      const dem = data.demograficos || {};
      // Si los nombres no existen, muestra N/A
      const nombre1 = dem.m1_nombre || 'N/A';
      const nombre2 = dem.m2_nombre || 'N/A';

      reportes.push({
        id: doc.id,
        fecha: data.fecha || new Date().toISOString(),
        nombre1: nombre1,
        nombre2: nombre2
        // Puedes agregar aquí otros campos si los necesitas
      });
    });
    return response.status(200).json(reportes);

  } catch (error) {
    console.error('Error al obtener los reportes:', error);
    return response.status(500).json({ error: 'Error interno del servidor' });
  }
}
