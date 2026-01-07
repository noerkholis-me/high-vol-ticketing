import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('NestApplication');
  const configService = new ConfigService();

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api/v1');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('High Volume Ticketing')
    .setDescription('Testing high traffic request platform')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  const PORT = configService.get<string>('PORT', '3000');
  await app.listen(PORT, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${PORT}/api/v1`);
  logger.log(`📚 Swagger docs available at: http://localhost:${PORT}/api/docs`);
}

void bootstrap();
