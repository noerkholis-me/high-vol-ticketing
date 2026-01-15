import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import { catchError, Observable, tap, throwError } from 'rxjs';

interface RequestWithRoute extends Request {
  route: {
    path?: string;
  };
}

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total') private readonly httpRequestsTotal: Counter<string>,
    @InjectMetric('http_requests_duration_seconds') private readonly httpRequestsDurationSeconds: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithRoute>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url } = request;
    const path = request.route?.path ?? url;
    const statusCode = response.statusCode.toString();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const duration = process.hrtime.bigint() - start;
        const seconds = Number(duration) / 1e9;

        this.httpRequestsTotal.inc({ method, path, statusCode });
        this.httpRequestsDurationSeconds.observe({ method, path, statusCode }, seconds);
      }),

      catchError((err: unknown) => {
        const duration = process.hrtime.bigint() - start;
        const seconds = Number(duration) / 1e9;

        this.httpRequestsTotal.inc({ method, path, statusCode });
        this.httpRequestsDurationSeconds.observe({ method, path, statusCode }, seconds);
        return throwError(() => err);
      }),
    );
  }
}
