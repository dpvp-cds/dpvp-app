const functions = require("firebase-functions");
const cors = require("cors")({origin: true});
const axios = require("axios");

// Tu clave secreta de reCaptcha (NUNCA la expongas en frontend)
const RECAPTCHA_SECRET = "6LcYOrUrAAAAAHaaYKbCPAEyAwmc5TD2pD6TGyeX"; 

exports.enviarReporteCaptcha = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send({ error: "Método no permitido" });
    }

    // 1. Recibe el token captcha del body de la petición (debe ser un campo 'g-recaptcha-response')
    const token = req.body["g-recaptcha-response"];
    if (!token) {
      return res.status(400).send({ error: "No se proporcionó token de google captcha" });
    }

    // 2. Validar el captcha con Google
    try {
      const googleRes = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify`,
        null, // sin body, va por query
        {
          params: {
            secret: RECAPTCHA_SECRET,
            response: token,
            // remoteip: opcional, req.ip
          },
        }
      );

      if (!googleRes.data.success) {
        return res.status(403).send({
          error: "Captcha inválido.",
          'google-msg': googleRes.data["error-codes"] || []
        });
      }
    } catch (err) {
      console.error("Captcha validation error:", err);
      return res.status(500).send({ error: "Error validando captcha Google" });
    }

    // 3. CAPTCHa VÁLIDO: Procesa el resto (guarda, envía mail, etc.)
    // Aquí procesas los demás campos recibidos.
    // Por ejemplo:
    /*
      const datos = req.body;
      // guarda en base de datos, envía mail, etc.
    */

    res.status(200).send({ status: "OK", message: "Captcha válido. Procesamiento exitoso." });
  });
});
