import { DynamicModule, ModuleMetadata, Provider } from "@nestjs/common";
import { ClassConstructor } from "class-transformer";
import EventEmitter from "eventemitter3";

import {
  ACTIVE_APPLICATION,
  AnyConfig,
  LOGGER_LIBRARY,
  MODULE_METADATA,
} from "../contracts";
import { RegisterCache } from "../includes";
import { BoilerplateModule } from "../modules";

export interface ApplicationModuleMetadata extends Partial<ModuleMetadata> {
  application?: string;
  configuration?: Record<string, AnyConfig>;
  globals?: Provider[];
}
export const NO_APPLICATION = "steggy_no_app";

/**
 * Intended to extend on the logic of nest's `@Controller` annotation.
 * This annotation will replace that one, and is intended for modules living in the apps folder.
 */
export function ApplicationModule(
  metadata: ApplicationModuleMetadata,
): ClassDecorator {
  // No symbol applications, for when you really just don't care
  // Doesn't meaningfully need imports I guess
  metadata.application ??= NO_APPLICATION;
  metadata.imports ??= [];
  metadata.providers ??= [];
  metadata.globals ??= [];
  metadata.configuration ??= {};
  metadata.controllers ??= [];
  // metadata.
  [...metadata.providers, ...metadata.controllers].forEach(provider => {
    provider[LOGGER_LIBRARY] = metadata.application;
  });
  const GLOBAL_SYMBOLS: Provider[] = [
    { provide: ACTIVE_APPLICATION, useValue: metadata.application },
    { provide: EventEmitter, useValue: new EventEmitter() },
    ...metadata.globals,
  ];
  metadata.imports = [
    BoilerplateModule.forRoot(),
    {
      exports: GLOBAL_SYMBOLS,
      global: true,
      module: class {},
      providers: GLOBAL_SYMBOLS,
      // Adding in 'type' for this one
      // Bootstrap will search it out, and maybe add even more symbols
      type: "GLOBAL_SYMBOLS",
    } as DynamicModule,
    RegisterCache(),
    ...metadata.imports,
  ];
  // LibraryModule.configs.set(metadata.application, {
  //   configuration: metadata.configuration ?? {},
  // });
  return (target: ClassConstructor<unknown>) => {
    target[MODULE_METADATA] = metadata;
    target[LOGGER_LIBRARY] = metadata.application;
    Object.entries(metadata).forEach(([property, value]) =>
      Reflect.defineMetadata(property, value, target),
    );
    return target;
  };
}
