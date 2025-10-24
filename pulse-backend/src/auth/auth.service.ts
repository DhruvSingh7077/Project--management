import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly supabase: SupabaseService,
  ) {}

  // REGISTER
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    // 1️⃣  Check if user already exists
    const existing = await this.supabase.client
      .from('User')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existing.error) throw new BadRequestException(existing.error.message);
    if (existing.data) throw new ConflictException('User already exists');

    // 2️⃣  Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3️⃣  Create new user
    const created = await this.supabase.client
      .from('User')
      .insert({ name, email, password: hashed })
      .select('*')
      .single();

    if (created.error) throw new BadRequestException(created.error.message);

    const user = created.data as User;

    // 4️⃣  Issue JWT
    const payload = { id: user.id, email: user.email };
    const token = await this.jwt.signAsync(payload);

    return { user, token };
  }

  // LOGIN
  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    // 1️⃣  Look up user by email
    const lookup = await this.supabase.client
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    if (lookup.error?.code === 'PGRST116' || !lookup.data)
      throw new UnauthorizedException('Invalid email or password');
    if (lookup.error) throw new BadRequestException(lookup.error.message);

    const user = lookup.data as User;

    // 2️⃣  Compare password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    // 3️⃣  Sign JWT
    const payload = { id: user.id, email: user.email };
    const token = await this.jwt.signAsync(payload);

    return { user, token };
  }

  // VERIFY USER (used for protected routes)
  async verify(token: string): Promise<User> {
    try {
      // 1️⃣  Verify token
      const decoded = await this.jwt.verifyAsync<{ id: string; email: string }>(
        token,
      );

      // 2️⃣  Retrieve user
      const found = await this.supabase.client
        .from('User')
        .select('*')
        .eq('id', decoded.id)
        .single();

      if (found.error?.code === 'PGRST116' || !found.data)
        throw new UnauthorizedException('User not found');
      if (found.error) throw new BadRequestException(found.error.message);

      return found.data as User;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
