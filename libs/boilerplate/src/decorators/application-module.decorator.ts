import { is } from "@digital-alchemy/utilities";
import { DynamicModule, ModuleMetadata, Provider } from "@nestjs/common";
import { ClassConstructor } from "class-transformer";
import EventEmitter from "eventemitter3";

import { RegisterCache } from "../includes";
import { BoilerplateModule } from "../modules";
import {
  ACTIVE_APPLICATION,
  AnyConfig,
  LOGGER_LIBRARY,
  MODULE_METADATA,
} from "../types";

export interface ApplicationModuleMetadata extends Partial<ModuleMetadata> {
  application?: string;
  configuration?: Record<string, AnyConfig>;
  globals?: Provider[];
}
export const NO_APPLICATION = "digital-alchemy_no_app";

/**
 * Some modules will provide their dependencies via a `.forRoot()` command, instead of through the annotation directly
 *
 * Search out modules annotated with `@LibraryModule`, and provided via a dynamic module object.
 * These will contain a module reference, and a new list of providers to use.
 * Fill in the library reference so logging & configuration work as expected
 */
function FixForRoot(item: DynamicModule) {
  if (!item.module) {
    return item;
  }
  const library = item.module[LOGGER_LIBRARY];
  if (is.empty(library) || is.empty(item.providers)) {
    return item;
  }
  item.providers.forEach(provider => {
    if (!is.function(provider)) {
      return;
    }
    provider[LOGGER_LIBRARY] = library;
  });
  return item;
}

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
    ...metadata.imports.map((item: DynamicModule) => FixForRoot(item)),
  ];
  return (target: ClassConstructor<unknown>) => {
    target[MODULE_METADATA] = metadata;
    target[LOGGER_LIBRARY] = metadata.application;
    Object.entries(metadata).forEach(([property, value]) =>
      Reflect.defineMetadata(property, value, target),
    );
    return target as ClassConstructor<unknown>;
  };
}
