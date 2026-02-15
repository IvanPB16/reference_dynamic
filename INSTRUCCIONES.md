# Crear orden – API Conekta / Dynamicore

Herramienta para crear órdenes en la API de Dynamicore (Conekta) desde un formulario web. El token de autorización (HMAC) se genera automáticamente con tu Client Key y Secret.

---

## Requisitos

- **Node.js** 14 o superior  
  Descarga: https://nodejs.org (recomendado versión LTS)

---

## Instalación

1. Descomprime el archivo ZIP en una carpeta (por ejemplo `genereteReferencia`).
2. Abre una terminal (CMD o PowerShell) en esa carpeta:
   ```bash
   cd ruta\donde\descomprimiste\genereteReferencia
   ```
3. No hace falta instalar paquetes: el proyecto usa solo módulos incluidos en Node.js.

---

## Cómo usar (interfaz web)

1. Inicia el servidor:
   ```bash
   npm start
   ```
   O directamente:
   ```bash
   node server.js
   ```

2. Abre el navegador y entra a:
   ```
   http://localhost:3000
   ```

3. En el formulario:
   - **Client Key**: tu clave de cliente (puede ir vacía si así lo usas en Postman).
   - **Secret (hash)**: el valor que se usa para generar la firma (el que en Postman pasas a SHA512). Si en Postman usas `hash = ''`, déjalo vacío.
   - Si prefieres, puedes pegar un **token Authorization (HMAC)** ya generado en el campo “token manual” y dejar Client Key y Secret vacíos.

4. Completa el resto (monto, nombre, teléfono, email, concepto, cuenta) y pulsa **Enviar orden**.

5. La respuesta de la API aparecerá debajo del botón (éxito en verde, error en rojo).

---

## Opcional: uso por consola

Si prefieres no usar el navegador:

```bash
npm run orden
```

o:

```bash
node crear_orden.js
```

Te pedirá los datos por consola (incluido el token HMAC manual, ya que en consola no se genera automáticamente).

---

## Cambiar el puerto

Por defecto el servidor usa el puerto **3000**. Para usar otro:

**Windows (CMD):**
```cmd
set PORT=8080
npm start
```

**Windows (PowerShell):**
```powershell
$env:PORT=8080; npm start
```

Luego abre: `http://localhost:8080`

---

## Estructura del proyecto

```
genereteReferencia/
├── INSTRUCCIONES.md   ← este archivo
├── package.json
├── server.js          ← servidor web (npm start)
├── crear_orden.js     ← menú por consola (npm run orden)
└── public/
    └── index.html     ← formulario web
```

---

## Cómo debuguear (que conteste correctamente)

Para ver en consola qué se envía y qué responde la API, arranca el servidor con **modo debug**:

**Windows (PowerShell):**
```powershell
$env:DEBUG="1"; npm start
```

**Windows (CMD):**
```cmd
set DEBUG=1
npm start
```

**Mac/Linux:**
```bash
DEBUG=1 npm start
```

Con `DEBUG=1` verás en la terminal del servidor:

- **Crear orden:** URL, body enviado, status y tamaño de la respuesta.
- **Consultar órdenes:**  
  - La cuenta usada.  
  - La llamada a list (GET órdenes) y tamaño de la respuesta.  
  - Cuántos IDs se obtienen (OXXO vs todos) y los primeros IDs.  
  - Por cada orden: `order_id`, `payment_method.type`, si se considera OXXO y si se añade al resultado.  
  - Errores de alguna orden (ej. status 4xx) con un trozo del body.  
  - Total de órdenes OXXO devueltas.

Así puedes comprobar:

1. Si el **list** devuelve datos (y qué estructura tiene).
2. Si los **order/get** responden 200 o fallan (y por qué).
3. Si el **channel** o **payment_method.type** se detecta como OXXO.
4. Si el mensaje de error de la API aparece en consola cuando algo falla.

---

## Solución de problemas

- **“Error de red”** al enviar: asegúrate de haber ejecutado `npm start` y de abrir `http://localhost:3000`.
- **La API devuelve error de autenticación**: revisa que Client Key y Secret (hash) sean los mismos que en Postman.
- **Node no reconocido**: instala Node.js desde https://nodejs.org y vuelve a abrir la terminal.