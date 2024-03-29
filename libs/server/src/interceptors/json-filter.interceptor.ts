import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, Observable } from "rxjs";

import { APIResponse } from "../contracts";
import { JSONFilterService } from "../services";

@Injectable()
export class JSONFilterInterceptor implements NestInterceptor {
  constructor(private readonly jsonFilter: JSONFilterService) {}

  public intercept<T extends unknown[]>(
    context: ExecutionContext,
    next: CallHandler<T[]>,
  ): Observable<unknown> {
    return next.handle().pipe(
      map(data => {
        const response = context.switchToHttp().getResponse<APIResponse>();
        const { control } = response.locals;
        return this.jsonFilter.query(control, data);
      }),
    );
  }
}
