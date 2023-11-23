import { LOG_CONTEXT } from "@digital-alchemy/boilerplate";
import { Inject, Provider } from "@nestjs/common";
import { v4 } from "uuid";

import { GotifyNotify } from "../services/gotify-notify.service";
import { Message } from "../types";

export const DYNAMIC_PROVIDERS = new Set<Provider>();
export type GotifyApp = (body: Message) => Promise<void>;

/**
 * Provide the application as string name.
 * This application must also be listed in the configuration, mapping a gotify application token.
 *
 * ---
 *
 * Use with `GotifyApp` as type definition
 *
 * ---
 *
 * **Make sure to use `GotifyModule.forRoot()` instead of directly importing the module in your imports.**
 */
export function SendFrom<T extends string>(application: T): ParameterDecorator {
  return function (target, key, index) {
    const id = v4();
    DYNAMIC_PROVIDERS.add({
      inject: [GotifyNotify],
      provide: id,
      useFactory(notify: GotifyNotify): GotifyApp {
        notify["application"] = application;
        return async data => {
          await notify.send(
            data,
            target.constructor[LOG_CONTEXT] ||
              target.constructor.name ||
              "Unknown",
          );
        };
      },
    } as Provider);
    return Inject(id)(target, key, index);
  };
}
