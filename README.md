# Trenfe BackEnd

API REST de Trenfe construida con Express + TypeScript sobre Deno, conectada a
MongoDB con Mongoose.

## Estado actual

- `deno check server.ts`: OK (aparece warning no bloqueante por `target` en
  `deno.json`).
- Proyecto operativo para autenticación, usuarios, noticias, tickets y tracking.

## Stack

- Deno
- Express
- Mongoose (MongoDB)
- JWT (`jose`)
- Seguridad (`helmet`, rate-limit, guards de payload)

## Estructura

- `server.ts`: bootstrap y montaje de rutas.
- `security.ts`: headers, rate limit, cache-control, guards anti XSS/SSRF/NoSQL
  injection.
- `auth.ts`: autorización admin/usuario.
- `util.ts`: utilidades JWT y helpers.
- `DB/`: modelos (`user`, `news`, `tickets`, `track`).
- `routes/`: endpoints de negocio.

## Variables de entorno

```env
MONGO_URI=
PORT=3000
ADMIN_TOKEN=
JWT_SECRET=
API_NINJAS_API_KEY=
GOOGLE_API_KEY=
```

## Ejecución

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

## Seguridad aplicada

- Hash de passwords con `bcryptjs`.
- JWT firmado con `JWT_SECRET`.
- Operaciones admin por `ADMIN_TOKEN`.
- Headers y hardening global en middleware.
