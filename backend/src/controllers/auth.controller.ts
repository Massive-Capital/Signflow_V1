import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { extractAccessToken, extractRefreshToken } from '../middleware/auth.middleware';
import { authService } from '../services/auth.service';
import { clearAuthCookies, setAuthCookies } from '../utils/auth-cookies';

export class AuthController {
  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  };

  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.login(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({ user: result.user });
  };

  refresh = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const refreshToken = extractRefreshToken(req, req.body.refreshToken);
    if (!refreshToken) {
      res.status(401).json({ error: { message: 'Refresh token is required', code: 'UNAUTHORIZED' } });
      return;
    }

    const result = await authService.refresh(refreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({ user: result.user });
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const accessToken = extractAccessToken(req);
    const refreshToken = extractRefreshToken(req, req.body.refreshToken);
    await authService.logout(accessToken, refreshToken);
    clearAuthCookies(res);
    res.status(204).send();
  };

  forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json(result);
  };

  resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.resetPassword(req.body);
    res.status(200).json(result);
  };

  verifyEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.verifyEmail(req.body.token);
    res.status(200).json(result);
  };

  resendVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.resendVerification(req.body.email);
    res.status(200).json(result);
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await authService.getCurrentUser(req.userId!);
    res.status(200).json({ user });
  };
}

export const authController = new AuthController();
