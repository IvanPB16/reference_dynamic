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
const DEBUG = process.env.DEBUG === "1" || process.env.DEBUG === "true";
const API_URL = "https://api.dynamicore.io/marketplace/apps/conekta/order/v3";
const REQUEST_PATH = "/marketplace/apps/conekta/order/v3";

function log(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

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
  log("POST crear orden →", API_URL, "body:", body.substring(0, 200) + (body.length > 200 ? "..." : ""));
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
      log("← crear orden status:", apiRes.statusCode, "body length:", chunks.length);
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
    log("← crear orden error:", err.message);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  });
  req.write(body, "utf8");
  req.end();
}

function proxyGet(res, auth, path, queryString) {
  const fullPath = queryString ? path + "?" + queryString : path;
  const opciones = {
    hostname: "api.dynamicore.io",
    port: 443,
    path: fullPath,
    method: "GET",
    headers: { Authorization: auth },
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
  req.end();
}

/** GET a la API y devuelve el body como string (Promise). */
function httpsGet(auth, path, queryString) {
  return new Promise((resolve, reject) => {
    const fullPath = queryString ? path + "?" + queryString : path;
    const url = "https://api.dynamicore.io" + fullPath;
    log("GET →", url);
    const opciones = {
      hostname: "api.dynamicore.io",
      port: 443,
      path: fullPath,
      method: "GET",
      headers: { Authorization: auth },
    };
    const req = https.request(opciones, (apiRes) => {
      let chunks = "";
      apiRes.on("data", (d) => (chunks += d));
      apiRes.on("end", () => {
        log("← GET", url, "status:", apiRes.statusCode, "body length:", chunks.length);
        if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) resolve(chunks);
        else {
          log("← body (primeros 300 chars):", chunks.substring(0, 300));
          reject(new Error("Status " + apiRes.statusCode + (chunks ? " " + chunks.substring(0, 150) : "")));
        }
      });
    });
    req.on("error", (err) => {
      log("← GET error", url, err.message);
      reject(err);
    });
    req.end();
  });
}

/** Extrae de la respuesta de order/get lo que importa: order y charge. */
function extractOrderAndCharge(getResponseBody) {
  let parsed;
  try {
    parsed = JSON.parse(getResponseBody);
  } catch {
    return null;
  }
  const data = parsed && parsed.data;
  if (!data) return null;
  const charges = data.charges && data.charges.data;
  const charge = Array.isArray(charges) && charges.length > 0 ? charges[0] : null;
  return {
    order: {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      payment_status: data.payment_status,
      customer_info: data.customer_info,
      created_at: data.created_at,
      updated_at: data.updated_at,
      metadata: data.metadata,
      livemode: data.livemode,
    },
    charge: charge
      ? {
          id: charge.id,
          status: charge.status,
          amount: charge.amount,
          currency: charge.currency,
          order_id: charge.order_id,
          payment_method: charge.payment_method,
          paid_at: charge.paid_at,
          created_at: charge.created_at,
        }
      : null,
  };
}

/** Obtiene ids de órdenes desde la respuesta de list. Si hay channel/payment_method, filtra solo OXXO. */
function getOrderIdsFromList(listBody, onlyOxxo) {
  let list;
  try {
    list = typeof listBody === "string" ? JSON.parse(listBody) : listBody;
  } catch {
    return [];
  }
  const arr = list.data || list.orders || list.items || (Array.isArray(list) ? list : []);
  if (!Array.isArray(arr)) return [];
  const filtered = onlyOxxo
    ? arr.filter((o) => o.channel === "oxxo" || (o.payment_method && o.payment_method.type === "oxxo"))
    : arr;
  return filtered
    .map((o) => (typeof o === "string" ? o : o.id || o.order_id))
    .filter(Boolean);
}

function proxyOrders(auth, account, res) {
  const queryString = "account=" + encodeURIComponent(account);
  proxyGet(res, auth, "/private/apps/orders", queryString);
}

function proxyOrderGet(auth, orderId, res) {
  const queryString = "order_id=" + encodeURIComponent(orderId);
  proxyGet(res, auth, "/marketplace/apps/conekta/order/get", queryString);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/api/order/get") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { clientKey, secretHash, auth, order_id: orderId } = JSON.parse(body);
        if (!orderId || !orderId.trim()) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false, error: "Falta order_id" }));
          return;
        }
        let authHeader;
        if (auth && auth.trim()) {
          authHeader = auth.trim();
        } else {
          const queryString = "order_id=" + encodeURIComponent(orderId.trim());
          authHeader = getAuthHeader(
            "GET",
            "/marketplace/apps/conekta/order/get",
            queryString,
            "",
            clientKey || "",
            secretHash || ""
          );
        }
        proxyOrderGet(authHeader, orderId.trim(), res);
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "Body JSON inválido" }));
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { clientKey, secretHash, auth, account } = JSON.parse(body);
        const acc = account || "90963";
        let authHeader;
        if (auth && auth.trim()) {
          authHeader = auth.trim();
        } else {
          const queryString = "account=" + encodeURIComponent(acc);
          authHeader = getAuthHeader(
            "GET",
            "/private/apps/orders",
            queryString,
            "",
            clientKey || "",
            secretHash || ""
          );
        }
        proxyOrders(authHeader, acc, res);
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: e.message || "Body JSON inválido" }));
      }
    });
    return;
  }

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
  if (DEBUG) console.log("DEBUG activado (DEBUG=1). Las peticiones y respuestas se mostrarán en esta consola.");
});
