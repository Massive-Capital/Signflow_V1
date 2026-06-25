import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { authService } from '../services/auth.service';

function extractBearerToken(authorizationHeader?: string): string | undefined {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return undefined;
  }
  return authorizationHeader.slice(7).trim() || undefined;
}

export class AuthController {
  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  };

  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  };

  refresh = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await authService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const accessToken = extractBearerToken(req.headers.authorization);
    await authService.logout(accessToken, req.body.refreshToken);
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

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await authService.getCurrentUser(req.userId!);
    res.status(200).json({ user });
  };
}

export const authController = new AuthController();
