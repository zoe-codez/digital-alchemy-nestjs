import { LibraryModule } from "@digital-alchemy/boilerplate";
import { DynamicModule } from "@nestjs/common";
import { join } from "path";
import { cwd } from "process";

import {
  LIB_TYPE_GENERATE,
  TYPE_AGGREGATOR_BASE,
  TYPE_AGGREGATOR_KEY,
  TYPES_CACHE_DIRECTORY,
} from "../config";
import { TypeGenerateController } from "../controllers";
import {
  AggregateService,
  HashService,
  HomeAssistantService,
  RebuildService,
  ReflectDataService,
  TypeFetchService,
} from "../services";
import { TypeGenerateModuleConfiguration } from "../types";

const providers = [
  AggregateService,
  HashService,
  HomeAssistantService,
  RebuildService,
  ReflectDataService,
  TypeFetchService,
];
const libraryExports = [
  RebuildService,
  TypeFetchService,
  //
];

@LibraryModule({
  configuration: {
    [TYPES_CACHE_DIRECTORY]: {
      default: join(cwd(), ".type-generate-cache"),
      type: "string",
    },
    [TYPE_AGGREGATOR_BASE]: {
      default: "http://192.168.1.100:7001",
      type: "string",
    },
    [TYPE_AGGREGATOR_KEY]: {
      default: "",
      type: "string",
    },
    [VERIFICATION_FILE]: {
      default: "digital_alchemy_configuration",
      description:
        "Target file for storing app configurations within the package folder.",
      type: "string",
    },
  },
  exports: libraryExports,
  imports: [],
  library: LIB_TYPE_GENERATE,
  providers,
})
export class TypeGenerateModule {
  public static forRoot(
    configuration: TypeGenerateModuleConfiguration,
  ): DynamicModule {
    const out = {
      exports: libraryExports,
      module: TypeGenerateModule,
      providers,
    } as DynamicModule;
    if (configuration.controllers) {
      out.controllers = [TypeGenerateController];
    }
    return out;
  }
}
