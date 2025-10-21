import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    // Loads .env so SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are available
    ConfigModule.forRoot({ isGlobal: true }),
    // Makes SupabaseService available app-wide
    SupabaseModule,
    AuthModule,
    ProjectModule,
    UserModule,
    TaskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
