import { Controller, Injectable, Provider, Type } from "@nestjs/common";
import { is } from "@digital-alchemy/utilities";
import { ClassConstructor } from "class-transformer";
import { exit } from "process";

import { Bootstrap, BootstrapOptions } from "../includes";
import { MODULE_METADATA } from "../types";
import {
  ApplicationModule,
  ApplicationModuleMetadata,
} from "./application-module.decorator";

/**
 * Magic timeout makes things work. Don't know why process.nextTick() isn't sufficient
 */
const WAIT_BOOTSTRAP = 50;
const SUCCESS = 0;

export type QuickScriptOptions = ApplicationModuleMetadata & {
  /**
   * Allow the application to keep running after `exec` finishes
   */
  PERSISTENT?: boolean;
  WAIT_TIME?: number;
  bootstrap?: BootstrapOptions;
  /**
   * If passed, the class will be set up as a NestJS controller.
   * Allows usage of annotations like `@Get`, `@Post`, `@Put`, ... etc.
   * ServerModule and enabling http still must be performed
   */
  controller?: string;
};

/**
 * Use as an annotation for a single NestJS provider.
 * Will bootstrap a minimal TTY app around the provider, and will use the `exec` method as the entrypoint.
 *
 * Intended for quick / minimal scripts, where it is preferable to keep all application code inside a single file.
 *
 * ## Entrypoint
 *
 * If an `exec` entrypoint is provided on the annotated class, then it will be utilized as an "entrypoint".
 * This entrypoint runs AFTER all the normal startup lifecycle events finish, and is entirely optional depending on the way you intend to build your application.
 *
 * If the `exec` entrypoint is provided, then `@QuickScript` will consider the `PERSISTENT` argument passed into the annotation options.
 *
 * - when set to `false`, the application will self-terminate when the logic for `exec` finishes.
 * - when set to `true`, the application will be allowed to run as long as it wants
 */
export function QuickScript({
  WAIT_TIME = WAIT_BOOTSTRAP,
  PERSISTENT = false,
  bootstrap = {},
  controller,
  ...metadata
}: QuickScriptOptions = {}): ClassDecorator {
  // Set up a bunch of defaults
  metadata.imports ??= [];
  metadata.providers ??= [];
  metadata.controllers ??= [];
  bootstrap.lifecycle ??= {};
  bootstrap.lifecycle.postInit ??= [];
  bootstrap.logging ??= {};
  bootstrap.logging.nestNoopLogger ??= true;
  bootstrap.logging.prettyLog ??= true;
  metadata.application ??= "digital-alchemy-quick-script";

  // Corrective measures for loading metadata
  return function (target: Type) {
    bootstrap.lifecycle.postInit.push(app =>
      setTimeout(async () => {
        const provider = app.get(target);
        if (is.function(provider.exec)) {
          await provider.exec();
          if (!PERSISTENT) {
            exit(SUCCESS);
          }
        }
      }, WAIT_TIME),
    );
    target[MODULE_METADATA] = metadata;
    // ? When TS is applying the @QuickScript annotation to the target class
    // Set up a fake application module that uses it as the only provider
    // Bootstrap that module, and call the `exec()` method on the target class to officially "start" the app
    //
    setTimeout(
      async () => await Bootstrap(CREATE_BOOT_MODULE(metadata), bootstrap),
      WAIT_BOOTSTRAP,
    );
    metadata.providers.push(target as unknown as Provider);
    if (bootstrap?.http && is.string(controller)) {
      metadata.controllers.push(target);
      return Controller(controller)(target);
    }
    return Injectable()(target);
  };
}
const CREATE_BOOT_MODULE = (metadata: ApplicationModuleMetadata) =>
  ApplicationModule(metadata)(class {}) as ClassConstructor<unknown>;
