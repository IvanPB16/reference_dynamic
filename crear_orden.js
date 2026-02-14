/**
 * Script interactivo para crear órdenes en la API de Dynamicore (Conekta).
 * Menú para ingresar los datos y ejecutar la petición.
 * Ejecutar en Windows: node crear_orden.js
 */

const readline = require("readline");
const https = require("https");

const API_URL = "https://api.dynamicore.io/marketplace/apps/conekta/order/v3";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function pregunta(texto, defecto = "") {
  const sufijo = defecto ? ` [${defecto}]: ` : ": ";
  return new Promise((resolve) => {
    rl.question(texto + sufijo, (resp) => {
      resolve(typeof resp === "string" ? resp.trim() : "");
    });
  });
}

function preguntaConDefecto(texto, defecto) {
  return pregunta(texto, defecto).then((r) => (r === "" ? defecto : r));
}

async function obtenerAuth() {
  const envAuth = process.env.HMAC_AUTH || process.env.DYNAMICORE_AUTH;
  if (envAuth) {
    const usar = await preguntaConDefecto("¿Usar HMAC_AUTH de variable de entorno?", "s");
    if (usar.toLowerCase() === "s") return envAuth;
  }
  return pregunta("Authorization (HMAC)");
}

async function menuPrincipal() {
  console.log("\n==================================================");
  console.log("  Crear orden - API Conekta / Dynamicore");
  console.log("==================================================\n");

  const amountStr = await preguntaConDefecto("Monto (amount)", "18.0");
  const amount = parseFloat(amountStr) || 18.0;

  const name = await preguntaConDefecto("Nombre (name)", "Dante");
  const phone = await preguntaConDefecto("Teléfono (phone)", "5512345678");
  const email = await preguntaConDefecto("Email (email)", "correo.ejemplo@test.com");
  const concept = await preguntaConDefecto("Concepto (concept)", "Deposito");
  const account = await preguntaConDefecto("Cuenta (account)", "95476");

  return { amount, name, phone, email, concept, account };
}

function hacerRequest(auth, data) {
  const url = new URL(API_URL);
  const body = JSON.stringify(data);

  const opciones = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body, "utf8"),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(opciones, (res) => {
      let chunks = "";
      res.on("data", (d) => (chunks += d));
      res.on("end", () => {
        console.log("\n--- Respuesta ---");
        console.log("Status:", res.statusCode);
        try {
          const json = JSON.parse(chunks);
          console.log("Body:", JSON.stringify(json, null, 2));
        } catch {
          console.log("Body:", chunks);
        }
        resolve(res);
      });
    });
    req.on("error", reject);
    req.write(body, "utf8");
    req.end();
  });
}

async function main() {
  try {
    const auth = await obtenerAuth();
    if (!auth) {
      console.error("Falta el token de autorización.");
      process.exit(1);
    }

    const data = await menuPrincipal();
    console.log("\nEnviando petición...");
    console.log("URL:", API_URL);
    console.log("Body:", JSON.stringify(data, null, 2));

    await hacerRequest(auth, data);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
