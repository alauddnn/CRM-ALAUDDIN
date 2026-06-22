import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so the Next.js frontend can connect smoothly
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('CRM Lead & SPK API')
    .setDescription('Technical Test Backend - NestJS with PostgreSQL and Prisma')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server on port 3333
  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`NestJS Backend running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
