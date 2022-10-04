import { INestApplication } from "@nestjs/common";

import {
  AbstractConfig,
  ACTIVE_APPLICATION,
  ConfigDefinitionDTO,
  ConfigTypeDTO,
} from "../contracts";
import {
  CONFIG_DEFAULTS,
  CONSUMES_CONFIG,
  LOGGER_LIBRARY,
} from "../contracts/constants";
import { LibraryModule, MESSY_INJECTED_CONFIGS } from "../decorators";
import { ModuleScannerService } from "../services";

export function ScanConfig(
  app: INestApplication,
  config?: AbstractConfig,
): ConfigDefinitionDTO {
  const scanner = app.get(ModuleScannerService);
  const used = new Set<string>();

  const map = scanner.findWithSymbol<[string, symbol][]>(CONSUMES_CONFIG);
  const out: ConfigTypeDTO[] = [];

  map.forEach((config, instance) => {
    const ctor = instance.constructor;
    const library = ctor[LOGGER_LIBRARY] || "application";
    config.forEach(([property, from]) => {
      const target = from ? from.description : library;
      const joined = [target, property].join(".");
      if (used.has(joined)) {
        return;
      }
      used.add(joined);
      const loadedModule = LibraryModule.quickMap.get(target);
      const { configuration } = LibraryModule.loaded.get(loadedModule);
      const metadata =
        configuration[property] ?? MESSY_INJECTED_CONFIGS.get(property);
      out.push({
        library: from ? from.description : library,
        metadata,
        property,
      });
    });
  });
  return {
    application: app.get<symbol>(ACTIVE_APPLICATION).description,
    bootstrapOverrides: config ?? app.get(CONFIG_DEFAULTS),
    config: out,
  };
}
