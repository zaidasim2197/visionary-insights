import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export class AuthService {
  static async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      token,
      expiresIn: env.JWT_EXPIRES_IN,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  static async register({ name, email, password, role = 'Viewer' }) {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      const error = new Error(`User with email '${email}' already exists.`);
      error.statusCode = 409;
      error.code = 'CONFLICT';
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role
    });

    await user.save();

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };
  }
}
