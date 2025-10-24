import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('No token provided');

    try {
      // 1️⃣  Verify JWT signature and decode payload
      const payload = await this.jwt.verifyAsync<{ id: string; email: string }>(
        token,
      );

      // 2️⃣  Fetch the user from Supabase (replace "User" with your actual table)
      const { data: user, error } = await this.supabase.client
        .from('User')
        .select('*')
        .eq('id', payload.id)
        .single();

      if (error) {
        throw new UnauthorizedException(`User lookup failed: ${error.message}`);
      }

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // 3️⃣  Attach the user record to the request for downstream decorators
      (request as any).user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // helper
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
