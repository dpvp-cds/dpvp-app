// Importa las herramientas necesarias para crear PDF y enviar correos
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const nodemailer = require('nodemailer');

// Esta es la función principal que se ejecutará cuando el formulario se envíe
exports.handler = async function(event, context) {
    // 1. Recibir y procesar los datos enviados desde el formulario
    const data = JSON.parse(event.body);
    const { demograficos, resultados, detalles } = data;

    // 2. Crear un nuevo documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50; // Posición inicial para escribir en el PDF (desde arriba)

    // Función para añadir texto al PDF y bajar la posición
    function drawText(text, options = {}) {
        if (y < 50) { // Si nos quedamos sin espacio, añade una nueva página
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
        y -= (options.size || 11) + 5; // Mover hacia abajo para la siguiente línea
    }

    // 3. Escribir toda la información en el PDF
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

    // 4. Guardar el PDF como un buffer de bytes
    const pdfBytes = await pdfDoc.save();

    // 5. Configurar el servicio de correo
    // Estas variables las configuraremos de forma segura en Netlify
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: true,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

    // 6. Enviar el correo con el PDF adjunto
    try {
        await transporter.sendMail({
            from: `"Reportes DPvP" <${process.env.MAIL_USER}>`,
            to: 'dpvp.cds@emcotic.com',
            subject: `Nuevo Diagnóstico: ${demograficos.m1_nombre} y ${demograficos.m2_nombre}`,
            text: 'Se adjunta el reporte en PDF con los resultados del diagnóstico DPvP.',
            attachments: [{
                filename: `Reporte_DPvP_${demograficos.m1_nombre}_${demograficos.m2_nombre}.pdf`,
                content: Buffer.from(pdfBytes),
                contentType: 'application/pdf',
            }, ],
        });

        // 7. Si todo sale bien, responder al navegador que el envío fue exitoso
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Correo enviado con éxito' }),
        };
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Fallo al enviar el correo' }),
        };
    }
};
