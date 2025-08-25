// Importa las herramientas necesarias
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { Resend } = require('resend');

// Esta es la función principal que Vercel ejecutará
export default async function handler(request, response) {
    // 1. Inicializa Resend con tu API Key secreta
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 2. Recibir y procesar los datos enviados desde el formulario
    const data = request.body;
    const { demograficos, resultados, detalles } = data;

    // 3. Crear un nuevo documento PDF (esta parte no cambia)
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    function drawText(text, options = {}) {
        if (y < 50) {
            page = pdfDoc.addPage();
            y = height - 50;
        }
        page.drawText(text, {
            x: 50,
            y: y,
            font: options.bold ? boldFont : font,
            size: options.size || 11,
            color: options.color || rgb(0, 0, 0),
        });
        y -= (options.size || 11) + 5;
    }

    drawText('Reporte de Diagnóstico DPvP', { bold: true, size: 18 });
    y -= 10;
    drawText('Datos Demográficos', { bold: true, size: 14 });
    drawText(`Miembro 1: ${demograficos.m1_nombre} (${demograficos.m1_edad} años) - Ocupación: ${demograficos.m1_ocupacion}`);
    drawText(`Miembro 2: ${demograficos.m2_nombre} (${demograficos.m2_edad} años) - Ocupación: ${demograficos.m2_ocupacion}`);
    y -= 5;
    const unionMap = { solo_novios: 'Solo novios (sin convivir)', union_libre: 'Unión Libre', religion: 'Casados por religión', civil: 'Casados por lo civil' };
    drawText(`Relación: ${demograficos.tiempo_relacion} años | Convivencia: ${demograficos.tiempo_convivencia} años | Unión: ${unionMap[demograficos.tipo_union]}`);
    if (demograficos.anos_casados > 0) {
        drawText(`Años de casados: ${demograficos.anos_casados}`);
    }
    drawText(`Hijos: ${demograficos.num_hijos} | Mascotas: ${demograficos.num_mascotas}`);
    y -= 10;
    drawText('Resultados Cuantitativos', { bold: true, size: 14 });
    for (const ambito in resultados) {
        drawText(`${ambito}: ${resultados[ambito].toFixed(2)} / 10.00`);
    }
    y -= 10;
    drawText('Respuestas Detalladas', { bold: true, size: 14 });
     for (const ambito in detalles) {
        y -= 5;
        drawText(ambito, { bold: true });
        detalles[ambito].forEach((respuesta, index) => {
            let respuestaTexto = '';
            if (typeof respuesta === 'object' && respuesta.respuesta === 'Solo Uno') {
                const nombreQuien = respuesta.quien === 'Miembro 1' ? demograficos.m1_nombre : demograficos.m2_nombre;
                respuestaTexto = `Solo Uno (Seleccionado: ${nombreQuien})`;
            } else {
                respuestaTexto = respuesta;
            }
            drawText(`- Pregunta ${index + 1}: ${respuestaTexto}`);
        });
    }

    const pdfBytes = await pdfDoc.save();

    // 4. Enviar el correo usando Resend
    try {
        await resend.emails.send({
            from: 'Reportes DPvP <onboarding@resend.dev>', // Resend requiere este remitente genérico en el plan gratuito
            to: 'dpvp.cds@emcotic.com',
            subject: `Nuevo Diagnóstico: ${demograficos.m1_nombre} y ${demograficos.m2_nombre}`,
            html: '<p>Se adjunta el reporte en PDF con los resultados del diagnóstico DPvP.</p>',
            attachments: [{
                filename: `Reporte_DPvP_${demograficos.m1_nombre}_${demograficos.m2_nombre}.pdf`,
                content: Buffer.from(pdfBytes),
            }],
        });

        response.status(200).json({ message: 'Correo enviado con éxito' });

    } catch (error) {
        console.error('Error al enviar el correo:', error);
        response.status(500).json({ error: 'Fallo al enviar el correo' });
    }
}
