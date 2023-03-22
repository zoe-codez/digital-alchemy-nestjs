import { Inject, Provider } from "@nestjs/common";
import { is } from "@digital-alchemy/utilities";
import { v4 as uuid } from "uuid";

import { AutoConfigService } from "../services/auto-config.service";
import {
  ACTIVE_APPLICATION,
  AnyConfig,
  CONSUMES_CONFIG,
  LOGGER_LIBRARY,
} from "../types";

export const CONFIG_PROVIDERS = new Set<Provider>();
export const MESSY_INJECTED_CONFIGS = new Map<string, AnyConfig>();

export function InjectConfig(
  /**
   * Name of property to inject (ex: `BASE_URL`)
   */
  path: string,
  /**
   * ### Cross project injections
   *
   * In order to access a configuration property owned by a different library, the library symbol must be provided in addition to the
   * property name as the 2nd argument
   *
   * `@InjectConfig(PAGE_SIZE, LIB_TTY) private readonly pageSize: number`
   *
   * ### "Messy definitions"
   *
   * > Feature available only for applications. Libraries are **REQUIRED** define their configurations at the module level
   *
   * For quick and dirty configurations, add metadata inline to keep everything together.
   *
   * - If reusing the configuration property multiple times, it's metadata should be attached to the module instead of here
   *
   * ```typescript
    export class ExampleClass {
      constructor(
        InjectConfig('NON_INTERACTIVE', {
          default: false,
          description: 'Process without user interactions',
          type: 'boolean',
        })
        private readonly nonInteractive: boolean,
      ) {}
    }
    ````
    > (there should be an `@` in front of that `InjectConfig`, but tsdoc hates that for me right now)
   */
  from?: string | AnyConfig,
): ParameterDecorator {
  return function (target, key, index) {
    if (is.object(from)) {
      MESSY_INJECTED_CONFIGS.set(path, from);
      from = undefined;
    }
    target[CONSUMES_CONFIG] ??= [];
    target[CONSUMES_CONFIG].push([path, from]);
    const id = uuid();
    CONFIG_PROVIDERS.add({
      inject: [AutoConfigService, ACTIVE_APPLICATION],
      provide: id,
      useFactory(config: AutoConfigService, application: string) {
        const configPath: string[] = [];
        const library: string = from || target[LOGGER_LIBRARY];
        // This can happen when libraries are having their types referenced, but not actually imported into the app
        if (!config.configDefinitions.has(library)) {
          return undefined;
        }
        if (library && library !== application) {
          configPath.push("libs", library);
          config["loadProject"](library);
        } else {
          configPath.push("application");
          config["loadProject"](application);
        }
        configPath.push(path);
        const out = config.get(configPath.join("."));
        return out;
      },
    });
    return Inject(id)(target, key, index);
  };
}

InjectConfig.inject = function (path: string, from?: symbol) {
  const id = uuid();
  CONFIG_PROVIDERS.add({
    inject: [AutoConfigService, ACTIVE_APPLICATION],
    provide: id,
    useFactory(config: AutoConfigService) {
      const configPath: string[] = [];
      if (from) {
        configPath.push("libs", from.description);
      } else {
        configPath.push("application");
      }
      configPath.push(path);
      return config.get(configPath.join("."));
    },
  });
  return id;
};
