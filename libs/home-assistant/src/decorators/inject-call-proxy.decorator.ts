import { Inject } from "@nestjs/common";

export const CALL_PROXY = Symbol.for("CALL_PROXY");

/**
 * Use with `iCallService`
 */
export function InjectCallProxy(): ParameterDecorator {
  return Inject(CALL_PROXY);
}
