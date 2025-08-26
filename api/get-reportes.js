import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON))
  });
}

const db = getFirestore();

export default async function handler(request, response) {
    try {
        const reportesSnapshot = await db.collection('reportes').orderBy('fecha', 'desc').get();
        const reportes = reportesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        response.status(200).json(reportes);
    } catch (error) {
        console.error("Error al obtener reportes: ", error);
        response.status(500).json({ error: 'Fallo al obtener los reportes' });
    }
}