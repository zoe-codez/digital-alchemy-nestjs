import { Inject } from "@nestjs/common";

export const CALL_PROXY = Symbol("CALL_PROXY");

/**
 * ## Description
 *
 * The call proxy is
 */
export function InjectProxy(): ParameterDecorator {
  return Inject(CALL_PROXY);
}
