/*
----------------------------------------------------------
JWT and Auth measures for Authentication and Authorization
----------------------------------------------------------
*/

import dotenv from "dotenv";
import { JWTPayload, jwtVerify, SignJWT } from "jose";

dotenv.config();
export const jwtsecret = Deno.env.get("JWT_SECRET");
export const adminauth = Deno.env.get("ADMIN_TOKEN");
const secret = new TextEncoder().encode(jwtsecret);


export async function createJWT(payload: JWTPayload): Promise<string> {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return jwt;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error: any) {
    return null;
  }
}

export const checkAuth = async (
  userid: string,
  token: string,
): Promise<boolean> => {
  if (!userid || !token) {
    return false;
  }
  if (token) {
    const userlegit = await verifyJWT(token);
    if (userlegit != null) {
      return true;
    }
  }
  return false;
};

export const getuserJWT = async (token: string): Promise<string> => {
  if (!token) {
    return "error";
  }
  if (token) {
    const userlegit = await verifyJWT(token);
    if (userlegit?.userid) {
      return userlegit.userid.toString();
    }
  }
  return "error";
};
