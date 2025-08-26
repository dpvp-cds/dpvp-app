import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON))
  });
}

const db = getFirestore();

export default async function handler(request, response) {
    const { id } = request.query;

    if (!id) {
        return response.status(400).json({ error: 'ID del reporte es requerido' });
    }

    try {
        const docRef = db.collection('reportes').doc(id);
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            response.status(200).json({ id: docSnap.id, ...docSnap.data() });
        } else {
            response.status(404).json({ error: 'Reporte no encontrado' });
        }
    } catch (error) {
        console.error("Error al obtener el reporte: ", error);
        response.status(500).json({ error: 'Fallo al obtener el reporte' });
    }
}