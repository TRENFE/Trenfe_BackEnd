# Trenfe Backend con Express + MongoDB

API REST construida con Express y TypeScript (ejecutada con Deno), conectada a MongoDB Atlas mediante Mongoose. Gestiona autenticacion JWT, usuarios, noticias, tickets y tracking de trenes.

## Estructura del Proyecto

```
/
├── server.ts                # Punto de entrada de la aplicacion
├── security.ts              # Middlewares de seguridad (headers, rate limit, guards)
├── util.ts                  # JWT helpers y utilidades
├── cache.ts                 # Cache
├── types.ts                 # Tipos compartidos
├── DB/                      # Modelos de base de datos (Mongoose)
│   ├── news.ts              # Modelo de noticias
│   ├── tickets.ts           # Modelo de tickets
│   ├── track.ts             # Modelo de tracking de trenes
│   └── user.ts              # Modelo de usuarios
└── routes/                  # Rutas de la API
    ├── login.ts             # Autenticacion — POST /login
    ├── register.ts          # Registro — POST /register
    ├── token.ts             # Validacion de token — POST /token
    ├── news.ts              # Gestion de noticias — /news
    ├── ticket.ts            # Gestion de tickets — /ticket
    ├── track.ts             # Tracking de trenes — /track
    └── user.ts              # Gestion de usuarios — /user
```

## Instalacion

1. Clona el repositorio y entra en la carpeta del proyecto
2. Arranca el servidor:

```bash
deno task start
```

3. La API estara disponible en `http://localhost:3000`

## Variables de Entorno

Configura los siguientes valores antes de arrancar:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
PORT=3000
ADMIN_TOKEN=example-admin-token
JWT_SECRET=example-jwt-secret
API_NINJAS_API_KEY=example-api-key
GOOGLE_API_KEY=example-google-key
```
 _____________________________________________________________________________________
| Variable              | Descripcion                                                 |
|-----------------------|-------------------------------------------------------------|
| `MONGO_URI`           | Cadena de conexion a MongoDB Atlas                          |
| `PORT`                | Puerto en el que escucha el servidor (por defecto `3000`)   |
| `ADMIN_TOKEN`         | Token admin                                                 |
| `JWT_SECRET`          | Clave secreta para firmar JWT                               |
| `API_NINJAS_API_KEY`  | API key para geolocalizacion                                |
| `GOOGLE_API_KEY`      | API key usada para IA                                       |
 -------------------------------------------------------------------------------------
## Endpoints de la API

### Autenticacion

#### `POST /login`
Inicia sesion con email y password.

- **Body:**
```json
{ "email": "string", "password": "string" }
```
- **Respuesta 200:**
```json
{ "success": "OK", "userid": "string" }
```
- **Cookie:** `bearer=<token>; Secure; Path=/; SameSite=Strict`
- **Errores:** `400` parametros faltantes, `404` usuario no encontrado, `500` error interno

---

#### `POST /register`
Registra un usuario nuevo.

- **Body:**
```json
{ "userid": "string", "name": "string", "email": "string", "password": "string", "coins": "0" }
```
- **Respuesta 200:**
```json
{ "success": "OK", "userid": "string" }
```
- **Cookie:** `bearer=<token>; Secure; Path=/; SameSite=Strict`
- **Errores:** `400` parametros faltantes, `500` error interno

---

### Token

#### `POST /token`
Valida un token enviado en body y lo refleja en cookie.

- **Body:**
```json
{ "bearer": "string", "email": "string" }
```
- **Respuesta 200:**
```json
{ "success": "OK", "bearer": "string" }
```
- **Errores:** `400` faltan parametros, `401` bearer invalido, `404` usuario no encontrado

---

#### `POST /token/user`
Extrae datos de usuario desde el JWT.

- **Body:**
```json
{ "bearer": "string" }
```
- **Respuesta 200:**
```json
{
  "userid": "string",
  "email": "string",
  "coins": "string",
  "name": "string"
}
```
- **Errores:** `400` faltan parametros, `404` usuario no encontrado, `500` error interno

---

### Noticias

| Metodo | Ruta            | Descripcion                | Auth       |
|--------|-----------------|----------------------------|------------|
| GET    | `/news`         | Listar noticias            | No         |
| GET    | `/news/:newid`  | Obtener noticia por ID     | No         |
| POST   | `/news/create`  | Crear noticia              | Si (admin) |
| PUT    | `/news`         | Actualizar noticia         | Si (admin) |
| DELETE | `/news/:newid`  | Eliminar noticia           | Si (admin) |

---

### Tickets

| Metodo | Ruta                 | Descripcion                | Auth            |
|--------|----------------------|----------------------------|-----------------|
| GET    | `/ticket`            | Listar tickets             | No              |
| GET    | `/ticket/:ticketid`  | Obtener ticket por ID      | No              |
| POST   | `/ticket/create`     | Crear ticket               | Si (admin)      |
| POST   | `/ticket/sell`       | Vender/consumir ticket     | Usuario o admin |
| PUT    | `/ticket`            | Actualizar ticket          | Si (admin)      |
| DELETE | `/ticket/:ticketid`  | Eliminar ticket            | Si (admin)      |

---

### Tracking

| Metodo | Ruta                | Descripcion                              | Auth       |
|--------|---------------------|------------------------------------------|------------|
| GET    | `/track/:ticketid`  | Obtener posicion/tracking de un ticket   | No         |
| POST   | `/track/create`     | Crear tracking desde origen/destino      | Si (admin) |
| DELETE | `/track/:ticketid`  | Eliminar tracking                        | Si (admin) |

---

### Usuario

| Metodo | Ruta           | Descripcion                     | Auth            |
|--------|----------------|---------------------------------|-----------------|
| GET    | `/user`        | Listar usuarios                 | Si (admin)      |
| GET    | `/user/:userid`| Obtener usuario                 | Usuario o admin |
| PUT    | `/user`        | Actualizar usuario              | Usuario o admin |
| DELETE | `/user/:userid`| Eliminar usuario                | Usuario o admin |

---

## Modelos de Datos

### Usuario (`DB/user.ts`)
```typescript
{
  userid: string,
  name: string,
  email: string,
  password: string,
  coins: string,
  intentos: number
}
```

### Noticia (`DB/news.ts`)
```typescript
{
  newid: string,
  title: string,
  image: string,
  content: string,
  date: string
}
```

### Ticket (`DB/tickets.ts`)
```typescript
{
  ticketid: string,
  origin: string,
  destination: string,
  date: string,
  price: string,
  available: number
}
```

### Tracking (`DB/track.ts`)
```typescript
{
  ticketid: string,
  name: string,
  reverse: boolean,
  OriginX: number,
  OriginY: number,
  DestinationX: number,
  DestinationY: number,
  ActualX: number,
  ActualY: number,
  speed: number
}
```

## Seguridad

- Passwords hasheadas con `bcryptjs`
- JWT firmado con `JWT_SECRET`
- Cookie `bearer` con `Secure`, `Path=/`, `SameSite=Strict`
- Endpoints administrativos protegidos por `ADMIN_TOKEN`
- Headers de seguridad via `helmet`
- Rate limit global via `express-rate-limit`
- Guard global de peticiones:
  - Bloqueo de payloads XSS (`<script ...>`)
  - Bloqueo de patrones de RCE en campos sensibles (`cmd`, `exec`, etc.)
  - Validacion SSRF en campos URL (`url`, `callback`, `webhook`, etc.)
  - Sanitizacion de `req.body` y filtro de claves tipo NoSQL injection (`$`, `.`)

## Flujo de Autenticacion

```
Cliente                          Backend                        MongoDB
  |                                 |                               |
  |--- POST /login ---------------->|                               |
  |    { email, password }          |--- User.findOne({ email }) -->|
  |                                 |<------------------------------|
  |                                 |--- bcrypt.compare()           |
  |                                 |--- createJWT({ userid })      |
  |<-- 200 + cookie bearer ---------|                               |
  |                                 |                               |
  |--- POST /token/user ----------->|                               |
  |    { bearer }                   |--- getuserJWT(token)          |
  |                                 |--- User.findOne({ userid }) -->
  |<-- 200 { userid, email, ... } --|                               |
```

## Notas

- Si frontend y backend van en dominios distintos, configura CORS explicitamente
- Ajusta el rate limit segun entorno (desarrollo vs produccion)

