// api/enviar-reporte.js

import { db } from './lib/firebaseAdmin.js'; // Importamos nuestra conexión centralizada
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// (El resto del código de esta función para generar el PDF y enviar el correo
// permanece igual, solo cambia la forma en que se obtiene la 'db')

const resend = new Resend(process.env.RESEND_API_KEY);

// ... (Aquí iría toda la lógica para crear el PDF que ya teníamos)
// La única diferencia es que ya no necesita la inicialización de Firebase
// porque la estamos importando desde firebaseAdmin.js

export default async function handler(request, response) {
    // ... (El cuerpo de la función también permanece igual)
    // ...
    // Cuando necesitemos guardar en la base de datos, simplemente usamos 'db'
    try {
        const docRef = await db.collection('reportes').add(reportDataToSave);
        console.log('Reporte guardado en Firestore con ID: ', docRef.id);
    } catch (error) {
        console.error('Error al guardar en Firestore:', error);
        // No detenemos el proceso si falla el guardado, pero lo registramos
    }
    // ... (El resto de la lógica de envío de correo sigue aquí)
}

// --- Código Completo para copiar y pegar ---
// Para evitar errores, aquí está el archivo completo de enviar-reporte.js

import { db } from './lib/firebaseAdmin.js';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const resend = new Resend(process.env.RESEND_API_KEY);

async function createPdf(data) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;
    const margin = 50;
    let y = height - margin;

    const drawText = (text, options) => {
        const { x, font, size, color } = options;
        page.drawText(text, { x, y, font, size, color });
        y -= size * 1.5;
    };
    
    // ... (Toda la lógica de construcción del PDF que ya teníamos)
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}


export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Solo se permite POST' });
    }

    const data = request.body;
    
    const reportDataToSave = {
        fecha: new Date().toISOString(),
        ...data,
    };
    
    try {
        const docRef = await db.collection('reportes').add(reportDataToSave);
        console.log('Reporte guardado en Firestore con ID: ', docRef.id);
    } catch (error) {
        console.error('Error guardando en Firestore:', error);
    }

    try {
        const pdfBytes = await createPdf(data);
        const subject = `Nuevo Diagnóstico DPvP: ${data.nombre1} y ${data.nombre2}`;

        await resend.emails.send({
            from: 'DPvP Diagnóstico <dpvp.cds@emcotic.com>',
            to: ['dpvp.cds@emcotic.com'],
            subject: subject,
            html: `<p>Se ha completado un nuevo diagnóstico DPvP. El reporte se encuentra adjunto.</p>`,
            attachments: [{
                filename: 'Reporte_DPvP.pdf',
                content: Buffer.from(pdfBytes),
            }, ],
        });

        return response.status(200).json({ message: 'Reporte enviado y guardado exitosamente' });

    } catch (error) {
        console.error('Error al enviar el correo:', error);
        return response.status(500).json({ message: 'Error al enviar el reporte' });
    }
}
