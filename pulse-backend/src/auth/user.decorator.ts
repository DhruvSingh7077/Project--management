import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';

export const User = createParamDecorator(
  <K extends keyof PrismaUser>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): PrismaUser[K] | PrismaUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as PrismaUser;

    return data ? user?.[data] : user;
  },
);
