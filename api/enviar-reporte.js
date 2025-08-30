import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Resend } from "resend";

// --- INICIALIZACIÓN DE SERVICIOS ---
let db;
let resend;
let servicesInitialized = false;

try {
  // Verificamos si las credenciales existen antes de intentar parsear
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    if (!getApps().length) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      initializeApp({
        credential: cert(credentials)
      });
    }
    db = getFirestore();
    resend = new Resend(process.env.RESEND_API_KEY);
    servicesInitialized = true;
  } else {
    console.error("ERROR CRÍTICO: La variable GOOGLE_APPLICATION_CREDENTIALS_JSON no está definida.");
  }
} catch (e) {
  console.error("ERROR CRÍTICO: Fallo al inicializar los servicios de backend.", e);
}

// --- FUNCIÓN PRINCIPAL DEL HANDLER ---
export default async function handler(request, response) {

  if (!servicesInitialized) {
    console.error("La función se detuvo porque los servicios no se inicializaron.");
    return response.status(500).json({ message: "Error interno del servidor: Fallo en la configuración." });
  }

  // Ya no hay verificación de captcha aquí, recibimos los datos directamente
  const data = request.body;
  const { demograficos, resultados, detalles } = data;

  if (!demograficos || !resultados || !detalles) {
      return response.status(400).json({ message: "Faltan datos en la solicitud." });
  }

  // --- LÓGICA EXISTENTE (GUARDAR, PDF, EMAIL) ---
  try {
    const docRef = await db.collection("reportes").add({
      ...data,
      fecha: new Date().toISOString(),
    });
    console.log("Documento escrito con ID: ", docRef.id);
  } catch (e) {
    console.error("Error al añadir documento a Firestore: ", e);
  }

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = height - 50;

  async function drawText(text, options = {}) {
      const size = options.size || 11;
      const textFont = options.bold ? boldFont : font;
      const maxWidth = width - 100;
      const lineHeight = size + 5;

      function wrapText(text) {
          const words = text.split(" ");
          const lines = [];
          let currentLine = words[0] || "";
          for (let i = 1; i < words.length; i++) {
              const word = words[i];
              const textWidth = textFont.widthOfTextAtSize(currentLine + " " + word, size);
              if (textWidth < maxWidth) {
                  currentLine += " " + word;
              } else {
                  lines.push(currentLine);
                  currentLine = word;
              }
          }
          lines.push(currentLine);
          return lines;
      }

      const lines = wrapText(text);
      for (const line of lines) {
          if (y < 50 + lineHeight) {
              page = pdfDoc.addPage();
              y = height - 50;
          }
          page.drawText(line, { x: options.x || 50, y, font: textFont, size, color: options.color || rgb(0, 0, 0) });
          y -= lineHeight;
      }
  }

  await drawText("Reporte de Diagnóstico DPvP", { bold: true, size: 20 });
  y -= 20;
  await drawText("Datos Demográficos", { bold: true, size: 16 });
  y -= 5;
  await drawText(`Miembro 1: ${demograficos.m1_nombre} (${demograficos.m1_edad} años)`);
  await drawText(`Ocupación: ${demograficos.m1_ocupacion}`);
  y -= 10;
  await drawText(`Miembro 2: ${demograficos.m2_nombre} (${demograficos.m2_edad} años)`);
  await drawText(`Ocupación: ${demograficos.m2_ocupacion}`);
  y -= 10;
  const unionMap = { solo_novios: "Solo novios (sin convivir)", union_libre: "Unión Libre", religion: "Casados por religión", civil: "Casados por lo civil" };
  await drawText(`Tiempo total de relación: ${demograficos.tiempo_relacion} años`);
  if (demograficos.tipo_union !== "solo_novios") {
      await drawText(`Tiempo de convivencia: ${demograficos.tiempo_convivencia} años`);
  }
  await drawText(`Tipo de Unión: ${unionMap[demograficos.tipo_union]}`);
  if (demograficos.anos_casados > 0) {
      await drawText(`Años de casados: ${demograficos.anos_casados}`);
  }
  await drawText(`Hijos: ${demograficos.num_hijos} | Mascotas: ${demograficos.num_mascotas}`);
  y -= 20;
  await drawText("Resultados Cuantitativos", { bold: true, size: 16 });
  y -= 5;
  for (const ambito in resultados) {
      const puntajeTexto = `${resultados[ambito].toFixed(2)} / 10.00`;
      page.drawText(`${ambito}:`, { x: 50, y, font: boldFont, size: 11 });
      page.drawText(puntajeTexto, { x: 250, y, font, size: 11 });
      y -= 16;
  }
  y -= 20;
  await drawText("Respuestas Detalladas", { bold: true, size: 16 });
  const ambitosTextos = {
      "Ámbito Económico": ["1. ¿Ambos participan en la construcción del presupuesto familiar?", "2. ¿Ambos miembros aportan económicamente?", "3. ¿Ambos consideran que tienen un buen acuerdo en lo económico?", "4. ¿Ambos son sinceros con su pareja en el tema económico?"],
      "Ámbito Emocional": ["5. ¿Ambos consideran que hay adecuada comunicación en la pareja?", "6. ¿Ambos se respetan totalmente, sin presencia de algún tipo de maltrato?", "7. ¿Ambos sienten aún amor por su pareja?", "8. ¿Ambos están de acuerdo en todos los temas sexuales en la pareja?"],
      "Ámbito Salud": ["9. ¿Ambos están sanos, sin ninguna enfermedad/discapacidad grave?", "10. ¿Ambos tienen cobertura de salud?", "11. ¿Ambos atienden con celeridad cuando se presenta algún tema de salud?", "12. ¿Ambos apoyan cualquier situación de salud que se presente en la familia?"],
      "Ámbito Laboral": ["13. ¿Ambos miembros se sienten realizados profesional/laboralmente?", "14. ¿Ambos miembros tienen algún tipo de trabajo remunerado?", "15. ¿Ambos han propuesto un plan de vida para la vejez?", "16. ¿Ambos se sienten apoyados laboralmente por su pareja?"],
      "Ámbito Ocio": ["17. ¿Ambos reconocen gustos y hobbies en común?", "18. ¿Ambos han creado/propuesto algún espacio exclusivo para compartir como pareja?", "19. ¿Ambos miembros tienen espacios individuales para sí mismos?", "20. ¿Ambos celebran y recuerdan fechas especiales?"],
      "Ámbito Hijos": ["21. ¿Ambos hablaron con claridad el tema de los hijos antes de vivir en pareja?", "22. ¿Ambos estuvieron o están de acuerdo en el número de hijos a tener?", "23. ¿Ambos se sienten libres de presión por el tema de los hijos?", "24. ¿Ambos están de acuerdo en el tema de mascotas en el hogar?"],
      "Ámbito Hogar": ["25. ¿Ambos participaron en la escogencia del lugar donde viven?", "26. ¿Ambos se sienten a gusto y felices en el lugar donde viven?", "27. ¿Ambos permitirían convivir con otras personas diferentes a la pareja e hijos?", "28. ¿Ambos realizan por igual o bajo un acuerdo las tareas del hogar?"],
      "Ámbito Espiritual": ["29. ¿Ambos miembros comparten la misma creencia religiosa/espiritual?", "30. ¿Ambos aceptan las creencias personales de la pareja?", "31. ¿Ambos miembros de la pareja son felices?", "32. ¿Ambos miembros desean continuar en su relación de pareja actual?"],
  };
  for (const ambito in detalles) {
      y -= 10;
      await drawText(ambito, { bold: true, size: 12 });
      for (let index = 0; index < detalles[ambito].length; index++) {
          const respuesta = detalles[ambito][index];
          let respuestaTexto = "";
          if (typeof respuesta === "object" && respuesta !== null && respuesta.respuesta === "Solo Uno") {
              const nombreQuien = respuesta.quien === "Miembro 1" ? demograficos.m1_nombre : demograficos.m2_nombre;
              respuestaTexto = `Solo Uno (Seleccionado: ${nombreQuien || "No especificado"})`;
          } else {
              respuestaTexto = respuesta;
          }
          const preguntaCompleta = `${ambitosTextos[ambito][index]}: ${respuestaTexto}`;
          await drawText(preguntaCompleta);
      }
  }
  const pdfBytes = await pdfDoc.save();

  try {
    await resend.emails.send({
      from: "Reportes DPvP <onboarding@resend.dev>",
      to: "dpvp.cds@emcotic.com",
      subject: `Nuevo Diagnóstico: ${demograficos.m1_nombre} y ${demograficos.m2_nombre}`,
      html: "<p>Se adjunta el reporte en PDF con los resultados del diagnóstico DPvP.</p>",
      attachments: [
        {
          filename: `Reporte_DPvP_${demograficos.m1_nombre}_${demograficos.m2_nombre}.pdf`,
          content: Buffer.from(pdfBytes),
        },
      ],
    });
    response.status(200).json({
      message: "Correo y guardado exitosos"
    });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    response.status(500).json({ error: "Fallo al enviar el correo" });
  }
}

