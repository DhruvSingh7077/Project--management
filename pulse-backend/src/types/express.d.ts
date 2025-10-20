import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User; // ✅ this tells TS what `req.user` is
    }
  }
}
