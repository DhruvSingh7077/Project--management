import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // REGISTER
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    // Explicitly type the result
    const existing: User | null = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) throw new ConflictException('User already exists');

    const hashed: string = await bcrypt.hash(password, 10);

    // Explicitly type the created user
    const user: User = await this.prisma.user.create({
      data: { name, email, password: hashed },
    });

    // Explicitly type JWT payload and token
    const payload: { id: string; email: string } = {
      id: user.id,
      email: user.email,
    };
    const token: string = await this.jwt.signAsync(payload);

    return { user, token };
  }

  // LOGIN
  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    const user: User | null = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid: boolean = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const payload: { id: string; email: string } = {
      id: user.id,
      email: user.email,
    };
    const token: string = await this.jwt.signAsync(payload);

    return { user, token };
  }

  // VERIFY USER (used for protected routes)
  async verify(token: string): Promise<User> {
    try {
      const decoded: { id: string; email: string } =
        await this.jwt.verifyAsync(token);

      const user: User | null = await this.prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) throw new UnauthorizedException('User not found');

      return user;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
