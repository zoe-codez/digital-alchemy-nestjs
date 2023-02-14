import { INestApplication } from "@nestjs/common";

import {
  AbstractConfig,
  ACTIVE_APPLICATION,
  ConfigDefinitionDTO,
  ConfigTypeDTO,
} from "../contracts";
import { CONFIG_DEFAULTS } from "../contracts/constants";
import { AutoConfigService } from "../services";

export function ScanConfig(
  app: INestApplication,
  overrides?: AbstractConfig,
): ConfigDefinitionDTO {
  const configService = app.get(AutoConfigService);
  const description = app.get<string>(ACTIVE_APPLICATION);

  const config: ConfigTypeDTO[] = [];

  configService.configDefinitions.forEach((configuration, library) =>
    config.push(
      ...Object.entries(configuration).map(([property, metadata]) => ({
        library: library === description ? "application" : library,
        metadata,
        property,
      })),
    ),
  );
  return {
    application: app.get<string>(ACTIVE_APPLICATION),
    bootstrapOverrides: overrides ?? app.get(CONFIG_DEFAULTS),
    config,
  };
}
