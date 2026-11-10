import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/httpError.js';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function userFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return await User.findById(payload.sub);
  } catch {
    return null;
  }
}

export async function requireAuth(req, _res, next) {
  const user = await userFromRequest(req);
  if (!user) throw unauthorized('Your session has expired. Please log in again.');
  req.user = user;
  next();
}

export async function optionalAuth(req, _res, next) {
  req.user = await userFromRequest(req);
  next();
}
