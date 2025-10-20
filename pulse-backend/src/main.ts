import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable global validation for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove extra fields not defined in DTO
      forbidNonWhitelisted: true, // Throw error if unknown fields exist
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  // Optional: Enable CORS if your frontend will connect
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`,
  );
}

bootstrap();
