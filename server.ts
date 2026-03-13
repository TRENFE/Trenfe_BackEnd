import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user.ts";
import loginRoutes from "./routes/login.ts";
import registerRoutes from "./routes/register.ts";
import ticketRoutes from "./routes/ticket.ts";
import newsRoutes from "./routes/news.ts";
import cookieParser from "cookie-parser";
import tokenRoutes from "./routes/token.ts";
import trackRoutes from "./routes/track.ts";
import stripeRoutes from "./routes/stripe.ts"
import { updateTrainPositions } from "./util.ts";
import {
  apiRateLimiter,
  cacheHeaders,
  requestSecurityGuards,
  securityHeaders,
} from "./security.ts";
import { Buffer } from "node:buffer";

dotenv.config();

const app = express();
const port = Deno.env.get("PORT") || 3000;
const mongoUri = Deno.env.get("MONGO_URI") || "";

app.use(async (req: any, res: Response, next: any) => {
  if (req.url === "/stripe/update") {
    // Lee el body con la API nativa de Deno/Fetch
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    req.rawBody = rawBody;  // guárdalo en req.rawBody
    req.body = rawBody;     // y también en req.body para Stripe
    return next();
  }
  next();
});

app.disable("x-powered-by"); // Disable for black-box security
app.use(securityHeaders); // Global security headers
app.use(apiRateLimiter); // Global rate limiter
app.use(cacheHeaders); // Global cache-control policy
app.use(cookieParser());
app.use(requestSecurityGuards); // Custom middleware
app.use(express.json({ limit: "16kb" })); // Limit JSON body size to prevent DoS
app.use(express.urlencoded({ extended: false, limit: "16kb" })); // Limit URL-encoded body size


app.use("/stripe", stripeRoutes);
app.use("/user", userRoutes);
app.use("/login", loginRoutes);
app.use("/register", registerRoutes);
app.use("/ticket", ticketRoutes);
app.use("/news", newsRoutes);
app.use("/token", tokenRoutes);
app.use("/track", trackRoutes);


mongoose.connect(mongoUri)
  .then(() => {
    console.log("Conectado a MongoDB");
    app.listen(port, () => console.log(`Servidor en http://localhost:${port}`));

    updateTrainPositions();
    setInterval(updateTrainPositions, 1 * 60 * 1000);
  })
  .catch((err) => console.error("Error al conectar a MongoDB:", err));
