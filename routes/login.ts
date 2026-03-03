import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../DB/user.ts";
import { createJWT } from "../auth.ts";

const router = express.Router();

const normalizeUserId = (raw: string): string => {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 24) || `user_${crypto.randomUUID().slice(0, 8)}`;
};

const buildBaseUserId = (email: string, name?: string): string => {
  const namePart = (name || "").trim();
  if (namePart) return normalizeUserId(namePart);
  return normalizeUserId(email.split("@")[0] || "user");
};

const getUniqueUserId = async (base: string): Promise<string> => {
  const normalizedBase = normalizeUserId(base);
  let candidate = normalizedBase;
  let i = 1;

  while (await User.findOne({ userid: candidate })) {
    candidate = `${normalizedBase}_${i++}`.slice(0, 32);
  }

  return candidate;
};

router.post("/", async (req: Request, res: Response) => {
  try {
    if (req.body.email == null || req.body.password == null) {
      return res.status(400).json({ error: "Missing params" });
    }
    if (!req.body.email.toString().includes("@")) {
      res.status(500).json({ error: "El email parece invalido" });
    }
    const email = req.body.email;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }
    if (!await bcrypt.compare(req.body.password, user.password)) {
      user.intentos--;
      await user.save();
      //Prevent Dictionary Attacks
      if (user.intentos <= 0) {
        return res.status(404).json({ error: "Anti-BrutteForce Triggered" });
      }
    }
    user.intentos = 3;
    await user.save();
    const token = await createJWT({ userid: user.userid });
    res.set({
      "Set-Cookie": `bearer=${token}; Secure; Path=/; SameSite=Strict`,
      "Content-Type": "application/json",
    }).status(200).json({ success: "OK", userid: user.userid });
  } catch (_err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/google", async (req: Request, res: Response) => {
  try {
    const idToken = String(req.body?.idToken || "").trim();
    if (!idToken) {
      return res.status(400).json({ error: "Missing idToken" });
    }

    const googleClientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ||
      Deno.env.get("ID_OAUTH2") || "";
    if (!googleClientId) {
      return res.status(500).json({ error: "Google OAuth client ID not configured" });
    }

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!verifyRes.ok) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const tokenInfo = await verifyRes.json();
    if (tokenInfo?.aud !== googleClientId) {
      return res.status(401).json({ error: "Invalid audience" });
    }

    if (String(tokenInfo?.email_verified) !== "true") {
      return res.status(401).json({ error: "Google email not verified" });
    }

    const email = String(tokenInfo?.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: "Google email missing" });
    }

    const name = String(tokenInfo?.name || email.split("@")[0] || "Usuario");

    let user = await User.findOne({ email });
    if (!user) {
      const userid = await getUniqueUserId(buildBaseUserId(email, name));
      const randomPassword = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = new User({
        userid,
        name,
        email,
        password: hashedPassword,
        coins: "0",
        intentos: 3,
      });
      await user.save();
    }

    user.intentos = 3;
    await user.save();

    const token = await createJWT({ userid: user.userid });
    return res.set({
      "Set-Cookie": `bearer=${token}; Secure; Path=/; SameSite=Strict`,
      "Content-Type": "application/json",
    }).status(200).json({ success: "OK", userid: user.userid });
  } catch (_err: Error | any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
