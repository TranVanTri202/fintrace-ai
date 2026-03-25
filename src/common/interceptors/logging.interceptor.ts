import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const startTime = Date.now();

    return next
      .handle()
      .pipe(
        tap(() => {
          const res = context.switchToHttp().getResponse();
          const { statusCode } = res;
          const contentLength = res.get('content-length') || 0;
          this.logger.log(`${method} ${url} ${statusCode} - ${contentLength} - ${Date.now() - startTime}ms`);
        }),
      );
  }
}
