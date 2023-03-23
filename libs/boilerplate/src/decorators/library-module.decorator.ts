/* eslint-disable no-console */
import { Global, ModuleMetadata } from "@nestjs/common";
import { ClassConstructor } from "class-transformer";

import { AnyConfig, LOGGER_LIBRARY, MODULE_METADATA } from "../types";

export interface LibraryModuleMetadata extends Partial<ModuleMetadata> {
  configuration: Record<string, AnyConfig>;
  global?: boolean;
  library: string;
}

export function LibraryModule(metadata: LibraryModuleMetadata): ClassDecorator {
  const library = metadata.library;
  return ((target: ClassConstructor<unknown>) => {
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
  }) as ClassDecorator;
}
