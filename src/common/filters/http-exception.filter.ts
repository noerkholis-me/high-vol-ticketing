import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as { message?: string | string[] })?.message || exception.message
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error: exception instanceof HttpException ? exception.name : 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
