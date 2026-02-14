/**
 * Servidor para la interfaz web de creación de órdenes.
 * Sirve la vista HTML y hace de proxy a la API Dynamicore (Conekta).
 * Ejecutar: npm start  →  abrir http://localhost:3000
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const API_URL = "https://api.dynamicore.io/marketplace/apps/conekta/order/v3";
const REQUEST_PATH = "/marketplace/apps/conekta/order/v3";

/**
 * Genera el header Authorization DynamiCore (HMAC) igual que en Postman.
 * requestData = [timestamp, method, path, queryString, requestBody].join("").trim()
 * SECRET_KEY = hex(SHA512(secretHash))
 * authHeader = "DynamiCore " + clientKey + ":" + timestamp + ":" + hex(HMAC-SHA256(requestData, SECRET_KEY))
 */
function getAuthHeader(httpMethod, requestPath, queryString, requestBody, clientKey, secretHash) {
  const hash = typeof secretHash === "string" ? secretHash : "";
  const secretKeyHex = crypto.createHash("sha512").update(hash).digest("hex");
  const timestamp = Date.now();
  const requestData = [timestamp, httpMethod, requestPath, queryString, requestBody].join("").trim();
  const hmacDigest = crypto.createHmac("sha256", secretKeyHex).update(requestData).digest("hex");
  return "DynamiCore " + (clientKey || "") + ":" + timestamp + ":" + hmacDigest;
}

function servirArchivo(res, filePath, contentType) {
  const ruta = path.join(__dirname, filePath);
  fs.readFile(ruta, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No encontrado");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function proxyOrden(auth, data, res) {
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

  const req = https.request(opciones, (apiRes) => {
    let chunks = "";
    apiRes.on("data", (d) => (chunks += d));
    apiRes.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          status: apiRes.statusCode,
          body: chunks,
          ok: apiRes.statusCode >= 200 && apiRes.statusCode < 300,
        })
      );
    });
  });
  req.on("error", (err) => {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  });
  req.write(body, "utf8");
  req.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/api/orden") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const {
          clientKey,
          secretHash,
          auth,
          amount,
          name,
          phone,
          email,
          concept,
          account,
        } = JSON.parse(body);

        const data = {
          amount: parseFloat(amount) || 18,
          name: name || "Dante",
          phone: phone || "5512345678",
          email: email || "correo.ejemplo@test.com",
          concept: concept || "Deposito",
          account: account || "95476",
        };

        let authHeader;
        if (auth) {
          authHeader = auth;
        } else {
          const requestBody = JSON.stringify(data);
          const queryString = "";
          authHeader = getAuthHeader(
            "POST",
            REQUEST_PATH,
            queryString,
            requestBody,
            clientKey || "",
            secretHash || ""
          );
        }

        proxyOrden(authHeader, data, res);
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "Body JSON inválido" }));
      }
    });
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    servirArchivo(res, "public/index.html", "text/html; charset=utf-8");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("No encontrado");
});

server.listen(PORT, () => {
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log("Abre esa URL en el navegador para usar el formulario.");
});
