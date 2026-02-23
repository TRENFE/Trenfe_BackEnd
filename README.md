# Trenfe Backend con Express + MongoDB

API REST construida con Express y TypeScript, conectada a MongoDB Atlas mediante Mongoose. Gestiona autenticación JWT, usuarios, noticias y tickets para la intranet.

## Estructura del Proyecto

```
/
├── main.ts                  # Punto de entrada de la aplicación
├── DB/                      # Modelos de base de datos (Mongoose)
│   ├── news.ts              # Modelo de noticias
│   ├── tickets.ts           # Modelo de tickets
│   └── user.ts              # Modelo de usuarios
└── routes/                  # Rutas de la API
    ├── login.ts             # Autenticación — POST /login
    ├── register.ts          # Registro de usuarios — POST /register
    ├── token.ts             # Validación y refresco de token — POST /token
    ├── news.ts              # Gestion de noticias — /news
    ├── ticket.ts            # Gestion de tickets — /ticket
    └── user.ts              # Gestión de usuarios — /user
```

## Instalación

1. Clona el repositorio y entra en la carpeta del proyecto
2. Arranca el servidor:

```bash
deno task start
```

3. La API estará disponible en `http://localhost:3000`

## Variables de Entorno

Configura los siguientes valores antes de arrancar:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
PORT=3000
ADMIN_TOKEN=example-admin-token
JWT_SECRET=example-jwt-secret
```

| Variable      | Descripción                                                              |
|---------------|--------------------------------------------------------------------------|
| `MONGO_URI`   | Cadena de conexión a MongoDB Atlas. Reemplaza `<user>` y `<pass>`        |
| `PORT`        | Puerto en el que escucha el servidor (por defecto `3000`)                |
| `ADMIN_TOKEN` | Token estático para operaciones administrativas protegidas               |
| `JWT_SECRET`  | Clave secreta usada para firmar y verificar los tokens JWT               |

## Endpoints de la API

### Autenticación

#### `POST /login`
Inicia sesión con email y contraseña. Si las credenciales son correctas, devuelve un token JWT en cookie y en el cuerpo de la respuesta.

- **Body:**
```json
{ "email": "string", "password": "string" }
```
- **Respuesta 200:**
```json
{ "success": "OK", "userid": "string" }
```
- **Cookie:** `bearer=<token>; Secure; Path=/; SameSite=Strict`
- **Errores:** `400` si faltan parámetros o el email no tiene `@`, `404` si el usuario no existe o la contraseña es incorrecta, `500` en error interno

---

#### `POST /register`
Registra un nuevo usuario en el sistema.

- **Body:**
```json
{ "email": "string", "password": "string", "name": "string" }
```
- **Respuesta 200:**
```json
{ "success": "OK" }
```
- **Errores:** `400` si faltan parámetros o el email no es válido, `409` si el usuario ya existe

---

### Token

#### `POST /token`
Valida un token existente asociado a un email y lo refresca en cookie.

- **Body:**
```json
{ "bearer": "string", "email": "string" }
```
- **Respuesta 200:**
```json
{ "success": "OK", "bearer": "string" }
```
- **Cookie:** `bearer=<token>; Secure; Path=/; SameSite=Strict`
- **Errores:** `400` si faltan parámetros, `401` si el token es inválido (`Bearer corrupted`), `404` si el usuario no existe

---

#### `POST /token/user`
Extrae los datos del usuario a partir de un token JWT. Usado por el middleware del frontend para proteger rutas.

- **Body:**
```json
{ "bearer": "string" }
```
- **Respuesta 200:**
```json
{
  "userid": "string",
  "email": "string",
  "name": "string",
  "coins": number
}
```
- **Cookie:** Refresca automáticamente `bearer` en la respuesta
- **Errores:** `400` si falta el token, `404` si el usuario no existe, `500` en error interno

---

### Noticias

| Método | Ruta         | Descripción               | Auth       |
|--------|--------------|---------------------------|------------|
| GET    | `/news`      | Listar todas las noticias  | No         |
| GET    | `/news/:id`  | Obtener noticia por ID     | No         |
| POST   | `/news`      | Crear noticia              | Sí (admin) |
| PUT    | `/news/:id`  | Actualizar noticia         | Sí (admin) |
| DELETE | `/news/:id`  | Eliminar noticia           | Sí (admin) |

---

### Tickets

| Método | Ruta               | Descripción              | Auth       |
|--------|--------------------|--------------------------|------------|
| GET    | `/ticket`          | Listar todos los tickets  | No         |
| GET    | `/ticket/:id`      | Obtener ticket por ID     | No         |
| POST   | `/ticket/:id/buy`  | Comprar un ticket         | Sí         |
| POST   | `/ticket`          | Crear ticket              | Sí (admin) |
| PUT    | `/ticket/:id`      | Actualizar ticket         | Sí (admin) |
| DELETE | `/ticket/:id`      | Eliminar ticket           | Sí (admin) |

---

### Usuario

| Método | Ruta        | Descripción                       | Auth       |
|--------|-------------|-----------------------------------|------------|
| GET    | `/user/:id` | Obtener datos públicos de usuario | Sí         |
| PUT    | `/user/:id` | Actualizar datos de usuario       | Sí         |
| DELETE | `/user/:id` | Eliminar usuario                  | Sí (admin) |

---

## Modelos de Datos

### Usuario (`DB/user.ts`)
```typescript
{
  userid: string,    // Identificador único generado internamente
  name: string,      // Nombre del usuario
  email: string,     // Email (único)
  password: string,  // Hash bcrypt de la contraseña
  coins: number      // Saldo o créditos del usuario
}
```

### Noticia (`DB/news.ts`)
```typescript
{
  id: string,
  titulo: string,
  contenido: string,
  categoria: "general" | "tecnologia" | "recursos_humanos" | "eventos",
  fecha: string      // ISO 8601
}
```

### Ticket (`DB/tickets.ts`)
```typescript
{
  id: string,
  titulo: string,
  descripcion: string,
  precio: number,
  disponibles: number,
  fecha: string      // ISO 8601
}
```

## Seguridad

- Las contraseñas se almacenan hasheadas con **bcrypt**
- Los tokens se firman con **JWT** usando `JWT_SECRET`
- El token se transmite en una cookie con flags `Secure`, `Path=/` y `SameSite=Strict`
- Las rutas de administración están protegidas con `ADMIN_TOKEN`
- La validación del token se centraliza en `POST /token/user`, que es el endpoint que consume el middleware del frontend en cada petición protegida

## Flujo de Autenticación

```
Cliente                          Backend                        MongoDB
  │                                 │                               │
  ├─── POST /login ────────────────>│                               │
  │    { email, password }          ├── User.findOne({ email }) ───>│
  │                                 │<──────────────────────────────┤
  │                                 ├── bcrypt.compare()            │
  │                                 ├── createJWT({ userid })       │
  │<─── 200 + cookie bearer ────────┤                               │
  │                                 │                               │
  ├─── POST /token/user ───────────>│                               │
  │    { bearer }                   ├── getuserJWT(token)           │
  │                                 ├── User.findOne({ userid }) ──>│
  │<─── 200 { userid, email, ... } ─┤                               │
```

## Notas

- Asegúrate de configurar CORS correctamente si el frontend está en un dominio distinto
- Considera añadir rate limit en los endpoints `/login` y `/register` 
