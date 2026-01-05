import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse<Response<T>>();

    return next.handle().pipe(
      map((data: Response<T>) => ({
        statusCode: response.statusCode,
        message: data.message || 'Request successful',
        data: data.data,
      })),
    );
  }
}
