import { AuthService } from '../services/authService.js';

export class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required.'
          },
          generatedAt: new Date().toISOString()
        });
      }
      const result = await AuthService.login({ email, password });
      return res.status(200).json({
        data: result,
        recordCount: 1,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, email, and password are required.'
          },
          generatedAt: new Date().toISOString()
        });
      }
      const result = await AuthService.register({ name, email, password, role });
      return res.status(201).json({
        data: result,
        recordCount: 1,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res) {
    return res.status(200).json({
      data: req.user,
      recordCount: 1,
      generatedAt: new Date().toISOString()
    });
  }
}
