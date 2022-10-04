/* eslint-disable no-console */
import { Global, ModuleMetadata } from "@nestjs/common";
import { ClassConstructor } from "class-transformer";

import { AnyConfig, LOGGER_LIBRARY, MODULE_METADATA } from "../contracts";
import { ApplicationModuleMetadata } from "./application-module.decorator";

export interface LibraryModuleMetadata extends Partial<ModuleMetadata> {
  configuration: Record<string, AnyConfig>;
  global?: boolean;
  library: symbol;
}

export function LibraryModule(metadata: LibraryModuleMetadata): ClassDecorator {
  const library = metadata.library.description;
  // if (LibraryModule.configs.has(library)) {
  //   console.error(`Duplicate registration of library ${library}`);
  //   console.error(
  //     `Re-using the same library name across modules will cause conflicts in configuration definitions, potentially causing the app to not boot.`,
  //   );
  //   console.error(
  //     `Each instance of @LibraryModule should have a unique library name`,
  //   );
  //   exit();
  // }
  // LibraryModule.configs.set(library, { configuration: metadata.configuration });
  return (target: ClassConstructor<unknown>) => {
    LibraryModule.loaded.set(target, metadata);
    LibraryModule.quickMap.set(library, target);
    target[LOGGER_LIBRARY] = library;
    target[MODULE_METADATA] = metadata;
    metadata.providers ??= [];
    metadata.providers.forEach(
      provider => (provider[LOGGER_LIBRARY] = library),
    );
    if (metadata.global) {
      Global()(target);
    }
    delete metadata.global;
    Object.entries(metadata).forEach(([property, value]) =>
      Reflect.defineMetadata(property, value, target),
    );
  };
}
LibraryModule.quickMap = new Map<string, ClassConstructor<unknown>>();
LibraryModule.loaded = new Map<
  ClassConstructor<unknown>,
  LibraryModuleMetadata | ApplicationModuleMetadata
>();
