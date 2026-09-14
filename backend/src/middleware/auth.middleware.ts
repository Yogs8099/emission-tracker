import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/emission.types';

export interface UserContext {
  role: UserRole;
  organizationId?: number;
}

declare global {
  namespace Express {
    interface Request {
      userContext?: UserContext;
    }
  }
}

export const mockAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const roleHeader = req.header('x-user-role');
  const organizationHeader = req.header('x-organization-id');

  if (roleHeader !== 'Client' && roleHeader !== 'Admin') {
    res.status(401).json({
      success: false,
      message: 'Invalid or missing user role.',
    });
    return;
  }

  if (roleHeader === 'Client') {
    const organizationId = Number(organizationHeader);

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      res.status(401).json({
        success: false,
        message: 'Client organization ID is required.',
      });
      return;
    }

    req.userContext = {
      role: 'Client',
      organizationId,
    };
  } else {
    req.userContext = {
      role: 'Admin',
    };
  }

  next();
};