/* eslint-disable no-console */
import { Global, ModuleMetadata } from "@nestjs/common";
import { exit } from "process";

import { AnyConfig, LOGGER_LIBRARY, RepoMetadataDTO } from "../contracts";

export interface LibraryModuleMetadata extends Partial<ModuleMetadata> {
  configuration: Record<string, AnyConfig>;
  global?: boolean;
  library: symbol;
}

export function LibraryModule(metadata: LibraryModuleMetadata): ClassDecorator {
  const propertiesKeys = Object.keys(metadata);
  const library = metadata.library.description;
  if (LibraryModule.configs.has(library)) {
    console.error(`Duplicate registration of library ${library}`);
    console.error(
      `Re-using the same library name across modules will cause conflicts in configuration definitions, potentially causing the app to not boot.`,
    );
    console.error(
      `Each instance of @LibraryModule should have a unique library name`,
    );
    exit();
  }
  LibraryModule.configs.set(library, { configuration: metadata.configuration });
  return target => {
    target[LOGGER_LIBRARY] = library;
    metadata.providers ??= [];
    metadata.providers.forEach(provider => {
      provider[LOGGER_LIBRARY] = library;
    });
    if (metadata.global) {
      Global()(target);
    }
    delete metadata.global;
    propertiesKeys.forEach(property => {
      Reflect.defineMetadata(property, metadata[property], target);
    });
  };
}
LibraryModule.configs = new Map<string, RepoMetadataDTO>();
