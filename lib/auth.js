import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function hashPassword(p) {
  return bcrypt.hash(p, 10);
}

export async function comparePassword(p, hash) {
  return bcrypt.compare(p, hash);
}

export function getUserFromRequest(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}
