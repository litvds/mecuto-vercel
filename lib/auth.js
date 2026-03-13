import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const COOKIE_NAME = "mecuto_session";

function getSecret() {
  return process.env.AUTH_SECRET || "CHANGE_ME_SUPER_SECRET_1234567890";
}

export function hashPassword(plain) {
  return bcrypt.hashSync(String(plain), 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(String(plain), String(hash || ""));
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(user) {
  const data = {
    login: user.login,
    role: user.role,
    full_name: user.full_name || "",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function readSessionToken(token) {
  try {
    if (!token || !token.includes(".")) return null;
    const [payload, sig] = token.split(".");
    if (sign(payload) !== sig) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return readSessionToken(token);
}

export async function setSessionCookie(user) {
  const store = await cookies();
  const token = createSessionToken(user);
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
}

export function requireRole(user, allowed) {
  if (!user) throw new Error("Требуется вход");
  if (!allowed.includes(user.role)) throw new Error("Недостаточно прав");
}
