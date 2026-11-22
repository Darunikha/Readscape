import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { badRequest, conflict, unauthorized } from '../utils/httpError.js';

export async function register(req, res) {
  const { username, email, password, displayName } = req.body || {};
  if (!username || !email || !password) throw badRequest('Username, email and password are required');
  if (String(password).length < 8) throw badRequest('Password must be at least 8 characters', { password: 'Password must be at least 8 characters' });

  const uname = String(username).trim().toLowerCase();
  const mail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ $or: [{ username: uname }, { email: mail }] });
  if (existing) {
    throw conflict(existing.username === uname ? 'That username is already taken' : 'An account with that email already exists');
  }

  const user = await User.create({
    username: uname,
    email: mail,
    password: String(password),
    displayName: String(displayName || '').trim() || uname,
  });
  res.status(201).json({ token: signToken(user), user });
}

export async function login(req, res) {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) throw badRequest('Please enter your email or username and password');
  const id = String(identifier).trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select('+password');
  if (!user || !(await user.comparePassword(String(password)))) {
    throw unauthorized('Incorrect email/username or password');
  }
  res.json({ token: signToken(user), user });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
