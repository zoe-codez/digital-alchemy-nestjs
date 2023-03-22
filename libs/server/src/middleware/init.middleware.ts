import { Injectable, NestMiddleware } from "@nestjs/common";
import {
  AutoLogService,
  InjectConfig,
  storage,
} from "@digital-alchemy/boilerplate";
import {
  buildFilter,
  FilterDTO,
  FilterValueType,
  HTTP_METHODS,
  is,
  queryToControl,
} from "@digital-alchemy/utilities";
import { NextFunction } from "express";
import pino from "pino";

import { MAX_REQUEST_ID } from "../config";
import {
  APIRequest,
  APIResponse,
  QUERY_HEADER,
  ResponseLocals,
} from "../contracts";

let currentRequestId = 0;
const INCREMENT = 1;
/**
 * - Set up defaults on request locals
 * - Generate request id
 */
@Injectable()
export class InitMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(MAX_REQUEST_ID) private readonly rollover: number,
  ) {}

  public use(
    request: APIRequest,
    { locals }: APIResponse,
    next: NextFunction,
  ): void {
    locals.headers ??= new Map(
      Object.entries(request.headers as Record<string, string>),
    );
    currentRequestId = (currentRequestId + INCREMENT) % this.rollover;
    const logger = (AutoLogService.logger as pino.Logger).child({
      id: currentRequestId,
    });

    storage.run(logger, () => {
      locals.flags = new Set();
      // locals.auth ??= {};
      locals.start = new Date();
      locals.control = queryToControl(request.query as Record<string, string>);
      locals.method = request.method.toLowerCase() as HTTP_METHODS;
      locals.parameters = new Map(Object.entries(request.params));
      locals.roles = new Set();
      locals.authenticated = false;
      locals.query = new Map(Object.entries(request.query));
      this.mergeQueryHeader(locals);
      next();
    });
  }

  private mergeQueryHeader({ headers, control }: ResponseLocals): void {
    if (!headers.has(QUERY_HEADER)) {
      return;
    }
    const filters = control.filters;
    if (!is.empty(filters)) {
      this.logger.debug(`Merging ${QUERY_HEADER} into query params`);
    }
    try {
      const query: Record<string, FilterValueType | FilterValueType[]> =
        JSON.parse(headers.get(QUERY_HEADER));
      Object.entries(query).forEach(([key, value]) => {
        let found: FilterDTO;
        filters.forEach(filter => {
          if (filter.field === key) {
            found = filter;
          }
        });
        if (found) {
          this.logger.warn(
            {
              header: { key, value },
              queryParams: found,
            },
            `Filter conflict`,
          );
          filters.delete(found);
        }
        filters.add(buildFilter(key, value));
      });
    } catch (error) {
      this.logger.error(
        {
          error,
          value: headers.get(QUERY_HEADER),
        },
        `Bad json passed to ${QUERY_HEADER}`,
      );
    }
  }
}
