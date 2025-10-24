import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    // ✅ makes .env available everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // ✅ register JWT with the env secret
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'default_secret',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
      global: true,
    }),

    SupabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
