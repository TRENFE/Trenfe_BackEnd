# Trenfe BackEnd

API REST de Trenfe construida con Express + TypeScript sobre Deno y persistencia
en MongoDB mediante Mongoose. Centraliza la logica de autenticacion, catalogo,
tracking, compras y entrega del billete por correo.

## Estado actual

- Backend operativo para usuarios, noticias, tickets, tracking y pagos.
- Endurecimiento de seguridad aplicado a nivel global.
- Integracion activa con Stripe Checkout, generacion de QR y envio por SMTP.

## Nuevas caracteristicas destacadas

- Medidas de seguridad: `helmet`, `express-rate-limit`, saneado de payload,
  bloqueo de patrones XSS, validacion anti-SSRF, filtro basico anti-RCE,
  limpieza anti-NoSQL injection y politicas de cache controladas.
- Tracking ferroviario: rutas para consultar posicion de trenes y actualizacion
  de coordenadas desde los modelos de tracking.
- Pasarela Stripe: creacion de sesiones de checkout y actualizacion interna de
  la compra desde el webhook.
- Codigo QR + SMTP: al completar una venta se genera un identificador unico, se
  crea un QR y se envia por correo electronico como adjunto e imagen embebida.
- Login con Google: soporte para autenticacion mediante `idToken`.

## Stack

- Deno
- Express
- Mongoose (MongoDB)
- JWT (`jose`)
- `helmet`
- `express-rate-limit`
- Stripe SDK
- `qrcode`
- `nodemailer`

## Estructura

- `server.ts`: bootstrap, middlewares globales y montaje de rutas.
- `security.ts`: headers, rate limit, cache-control y validaciones defensivas.
- `auth.ts`: verificacion JWT y autorizacion.
- `util.ts`: helpers de IA, QR, correo y operaciones auxiliares.
- `DB/`: modelos (`user`, `news`, `tickets`, `track`).
- `routes/`: endpoints de negocio.
- `cache.ts`: cache interna para respuestas publicas.

## Variables de entorno

```env
MONGO_URI=
PORT=3000
ADMIN_TOKEN=
JWT_SECRET=
API_NINJAS_API_KEY=
GOOGLE_API_KEY=
GOOGLE_OAUTH_CLIENT_ID=
ID_OAUTH2=
STRIPE_PRIVATE_KEY=
SMTP_EMAIL=
SMTP_PASSWORD=
```

Notas:

- `GOOGLE_API_KEY` se usa en integraciones IA auxiliares.
- `STRIPE_PRIVATE_KEY` es obligatoria para crear sesiones de checkout.
- `SMTP_EMAIL` y `SMTP_PASSWORD` permiten el envio del billete con QR.

## Ejecucion

```bash
deno task start
```

Puerto por defecto: `3000`.

## Endpoints principales

### Auth

- `POST /login`
- `POST /login/google`
- `POST /register`

### Token

- `POST /token`
- `POST /token/user`

### Noticias

- `GET /news`
- `GET /news/:newid`
- `POST /news/create` (admin)
- `PUT /news` (admin)
- `DELETE /news/:newid` (admin)

### Tickets

- `GET /ticket`
- `GET /ticket/:ticketid`
- `POST /ticket/create` (admin)
- `POST /ticket/sell` (usuario/admin)
- `PUT /ticket` (admin)
- `DELETE /ticket/:ticketid` (admin)

### Tracking

- `GET /track`
- `GET /track/:ticketid`
- `POST /track/create` (admin)
- `DELETE /track/:ticketid` (admin)

### Usuarios

- `GET /user` (admin)
- `GET /user/:userid` (usuario/admin)
- `PUT /user` (usuario/admin)
- `DELETE /user/:userid` (usuario/admin)

### Pagos Stripe

- `POST /stripe/create`
- `POST /stripe/update`

## Seguridad aplicada

- Hash de passwords con `bcryptjs`.
- JWT firmado con `JWT_SECRET`.
- Operaciones admin protegidas con `ADMIN_TOKEN`.
- `helmet` para cabeceras de seguridad.
- Rate limiting global para mitigar abuso y DoS.
- Saneado de strings y objetos de entrada.
- Deteccion de etiquetas `<script>` para cortar XSS.
- Rechazo de URLs privadas o locales en campos sensibles para evitar SSRF.
- Filtrado de caracteres de shell en campos de riesgo.
- Eliminacion de claves peligrosas con `$` o `.` para reducir NoSQL injection.
- Cache publica unicamente en lecturas controladas de noticias, tickets y
  tracking.

