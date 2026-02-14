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

## Solución de problemas

- **“Error de red”** al enviar: asegúrate de haber ejecutado `npm start` y de abrir `http://localhost:3000`.
- **La API devuelve error de autenticación**: revisa que Client Key y Secret (hash) sean los mismos que en Postman.
- **Node no reconocido**: instala Node.js desde https://nodejs.org y vuelve a abrir la terminal.
