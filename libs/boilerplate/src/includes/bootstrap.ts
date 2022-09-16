/**
 * Something about bootstrapping completely breaks things with a normal reference.
 * Imports from @steggy/boilerplate are on purpose here
 * */
/* eslint-disable @nrwl/nx/enforce-module-boundaries, radar/no-identical-functions */
import {
  DynamicModule,
  INestApplication,
  INestApplicationContext,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import {
  AbstractConfig,
  AutoLogService,
  CONFIG_DEFAULTS,
  LIB_BOILERPLATE,
  LifecycleService,
  NEST_NOOP_LOGGER,
  NO_USER_CONFIG,
  UsePrettyLogger,
} from "@steggy/boilerplate";
import { eachSeries, is } from "@steggy/utilities";
import chalk from "chalk";
import { ClassConstructor } from "class-transformer";
import express, { Express } from "express";
import { exit } from "process";

export interface BootstrapOptions extends Pick<ModuleMetadata, "imports"> {
  /**
   * Provide alternate default values for configurations.
   * Takes priority over definitions from `@InjectConfig` and modules.
   * Overridden by all user values.
   */
  config?: AbstractConfig;
  /**
   * Insert additional modules.
   * Used for environment specific modules, 99% of the time these should be placed in the application module instead
   */
  extraModules?: DynamicModule[];
  /**
   * Activate application functionality by flags.
   *
   * Basically a more convenient way to add globals.
   */
  flags?: Array<string | symbol>;
  /**
   * Insert additional providers with a global scope.
   */
  globals?: Provider[];
  /**
   * Attach express to the nestjs app.
   * `ServerModule` from `@steggy/server` needs to be imported to actually listen for requests
   */
  http?: boolean;
  /**
   * If set to false, the application module be created but not initialized
   *
   * Use with testing
   */
  init?: boolean;
  /**
   * Disable nestjs log messages
   */
  nestNoopLogger?: boolean;
  /**
   * Additional functions to run postInit.
   * Run before those in providers
   */
  postInit?: ((
    app: INestApplication,
    expressServer: Express,
    bootOptions: BootstrapOptions,
  ) => Promise<void> | void | unknown | Promise<unknown>)[];
  /**
   * Additional functions to run preInit.
   * Run before those in providers
   */
  preInit?: ((
    app: INestApplication,
    expressServer: Express,
    bootOptions: BootstrapOptions,
  ) => Promise<void> | void)[];
  /**
   * Output logs using the pretty logger formatter instead of standard json logs.
   * Use with development environments only
   */
  prettyLog?: boolean;
  /**
   * Ignore user provided configuration values.
   * Only use defaults / bootstrap provided config
   */
  skipConfigLoad?: boolean;
}

/**
 * Standardized init process
 */
export async function Bootstrap(
  module: ClassConstructor<unknown>,
  bootOptions: BootstrapOptions,
): Promise<INestApplicationContext> {
  bootOptions.globals ??= [];
  // Environment files can append extra modules
  const current = Reflect.getMetadata("imports", module) ?? [];
  if (!is.empty(bootOptions.imports)) {
    current.push(...bootOptions.imports);
    Reflect.defineMetadata("imports", current, module);
  }
  const globals = current.find(item => item.type === "GLOBAL_SYMBOLS");
  if (!globals) {
    // Just not far enough along to have a real logger yet
    // eslint-disable-next-line no-console
    console.log(
      `Bootstrap requires modules be annotated with @ApplicationModule`,
    );
    exit();
  }
  const flags = bootOptions.flags ?? [];
  if (bootOptions.skipConfigLoad) {
    flags.push(NO_USER_CONFIG);
  }
  const append = [
    ...bootOptions.globals,
    ...flags.map(i => ({ provide: i, useValue: true })),
  ];
  append.push({
    provide: CONFIG_DEFAULTS,
    useValue: bootOptions.config ?? {},
  });
  globals.exports.push(...append);
  globals.providers.push(...append);

  let { preInit, postInit } = bootOptions;
  const { prettyLog, nestNoopLogger, http } = bootOptions;

  if (prettyLog && chalk.supportsColor) {
    UsePrettyLogger();
  }
  let server: Express;
  const options = {
    // Shh... no talky
    logger: nestNoopLogger ? NEST_NOOP_LOGGER : AutoLogService.nestLogger,
  };
  let app: INestApplication;
  try {
    if (http) {
      server = express();
      app = await NestFactory.create(module, new ExpressAdapter(server), {
        ...options,
        cors: true,
      });
    } else {
      app = await NestFactory.create(module, options);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  app.enableShutdownHooks();
  const lifecycle = app.get(LifecycleService);
  const logger = await app.resolve(AutoLogService);
  logger.setContext(LIB_BOILERPLATE, { name: "Bootstrap" });
  // onPreInit
  preInit ??= [];
  // if (noGlobalError !== true) {
  //   preInit.push(GlobalErrorInit);
  // }
  await eachSeries(preInit, async item => {
    await item(app, server, bootOptions);
  });
  await lifecycle.preInit(app, { options: bootOptions, server });
  // ...init
  // onModuleCreate
  // onApplicationBootstrap
  await app.init();
  // onPostInit
  postInit ??= [];
  await eachSeries(postInit, async item => {
    await item(app, server, bootOptions);
  });
  await lifecycle.postInit(app, { options: bootOptions, server });
  return app;
}
