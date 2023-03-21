import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { AutoLogService } from "@digital-alchemy/boilerplate";
import { is } from "@digital-alchemy/utilities";
import { catchError, Observable, tap, throwError } from "rxjs";

import { APIRequest, APIResponse } from "../contracts";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AutoLogService) {}

  public intercept<T>(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<unknown> {
    const prettyLogger = AutoLogService.prettyLogger;
    const request = context.switchToHttp().getRequest<APIRequest>();
    const extra = prettyLogger
      ? { auth: undefined }
      : { auth: undefined, route: [request.method, request.path] };
    const { locals } = context.switchToHttp().getResponse<APIResponse>();
    return next.handle().pipe(
      tap(response => {
        if (locals.authMethod) {
          extra.auth = locals.authMethod;
        }
        const responseTime = Date.now() - locals.start.getTime();
        const message = prettyLogger
          ? `[${request.method}] {${request.path}}`
          : "Request completed";
        this.logger.info({ responseTime, ...extra }, message);
        return response;
      }),
      catchError(error => {
        const responseTime = Date.now() - locals.start.getTime();
        const message = prettyLogger
          ? `[${request.method}] {${request.path}} ${error.message}`
          : `Request errored ${error.message}`;
        this.logger.error({ responseTime, ...extra }, message);
        if (is.string(error.stack)) {
          const [, ...stack] = (error.stack as string).split(`\n`);
          stack.forEach(line => this.logger.debug(` - ${line.trim()}`));
        }
        // This results in double errors
        // One coming from here, one from nestjs (with undefined context?)
        return throwError(() => error);
      }),
    );
  }
}
