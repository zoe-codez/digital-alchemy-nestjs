import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectConfig } from "@digital-alchemy/boilerplate";

import { AUTH_BYPASS } from "../config";
import { APIResponse } from "../contracts";

@Injectable()
export class IsAuthorizedGuard implements CanActivate {
  constructor(
    @InjectConfig(AUTH_BYPASS) private readonly authBypass: boolean,
  ) {}

  public canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const { locals } = context.switchToHttp().getResponse<APIResponse>();
    return locals.authenticated || this.authBypass;
  }
}
