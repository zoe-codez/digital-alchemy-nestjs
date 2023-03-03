/**
 * Something about bootstrapping completely breaks things with a normal reference.
 * Imports from @steggy/boilerplate are on purpose here
 * */
/* eslint-disable @nrwl/nx/enforce-module-boundaries, radar/no-identical-functions */
import {
  INestApplication,
  INestApplicationContext,
  ModuleMetadata,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import {
  AbstractConfig,
  AutoLogService,
  CONFIG_DEFAULTS,
  LIB_BOILERPLATE,
  LifecycleService,
  LogExplorerService,
  NEST_NOOP_LOGGER,
  PrettyLoggerConfig,
  UsePrettyLogger,
} from "@steggy/boilerplate";
import { eachSeries, is } from "@steggy/utilities";
import chalk from "chalk";
import { ClassConstructor } from "class-transformer";
import express, { Express } from "express";
import { exit } from "process";

export interface BootstrapOptions extends Pick<ModuleMetadata, "imports"> {
  /**
   * Changes to the way the application is wired & defaults
   */
  application?: {
    /**
     * Provide alternate default values for configurations.
     * Takes priority over definitions from `@InjectConfig` and modules.
     * Overridden by all user values.
     */
    config?: AbstractConfig;
    /**
     * Ignore user provided configuration values.
     * Only use defaults / bootstrap provided config
     */
    skipConfigLoad?: boolean;
  };
  http?: {
    /**
     * Server is cors enabled
     *
     * default: true
     */
    cors?: boolean;
    /**
     * Attach express to the nestjs app.
     * `ServerModule` from `@steggy/server` needs to be imported to actually listen for requests
     */
    enabled?: boolean;
  };
  /**
   * Modify the application lifecycle
   */
  lifecycle?: {
    /**
     * If set to false, the application module be created but not initialized.
     * Testing feature
     */
    init?: boolean;
    /**
     * Additional functions to run postInit.
     * First in line
     */
    postInit?: ((
      app: INestApplication,
      expressServer: Express,
      bootOptions: BootstrapOptions,
    ) => Promise<void> | void | unknown | Promise<unknown>)[];
    /**
     * Additional functions to run preInit.
     * First in line
     */
    preInit?: ((
      app: INestApplication,
      expressServer: Express,
      bootOptions: BootstrapOptions,
    ) => Promise<void> | void)[];
  };
  /**
   * Options to fine tune the logging experience
   */
  logging?: {
    /**
     * Disable nestjs log messages
     */
    nestNoopLogger?: boolean;
    /**
     * Output logs using the pretty logger formatter instead of standard json logs.
     * Use with development environments only
     */
    prettyLog?: boolean | PrettyLoggerConfig;

    /**
     * Log with blocking operations (default: false).
     *
     * Logging library does async logging for performance reasons.
     * This can cause logs to render in strange ways when used with `@steggy/tty`.
     * Forcing sync logs will resolve.
     *
     * Has a performance penalty for more traditional applications.
     * Leave on for most normal nodejs applications
     */
    sync?: boolean;
  };
}

/**
 * Standardized init process
 */
export async function Bootstrap(
  application: ClassConstructor<unknown>,
  bootOptions: BootstrapOptions,
): Promise<INestApplicationContext> {
  // Environment files can append extra modules
  const current = Reflect.getMetadata("imports", application) ?? [];
  // console.log(current);
  if (!is.empty(bootOptions.imports)) {
    current.push(...bootOptions.imports);
    Reflect.defineMetadata("imports", current, application);
  }

  //  * Retrieve a dynamic module injected by the annotation.
  //  * It contains additional providers that get injected globally, which are used to further bootstrap.
  const globals = current.find(item => item.type === "GLOBAL_SYMBOLS");
  if (!globals) {
    // Just not far enough along to have a real logger yet
    // eslint-disable-next-line no-console
    console.log(
      `Bootstrap requires modules be annotated with @ApplicationModule`,
    );
    exit();
  }
  // * Add even more stuff to the globals
  const configDefaults = {
    provide: CONFIG_DEFAULTS,
    useValue: bootOptions?.application?.config ?? {},
  };
  globals.exports.push(configDefaults);
  globals.providers.push(configDefaults);

  // * Pull data out of the bootstrap config
  const {
    logging: { prettyLog = false, nestNoopLogger = false } = {},
    http: { cors = true, enabled: httpEnabled = false } = {},
    lifecycle: { init = true, preInit = [], postInit = [] } = {},
  } = bootOptions;

  // * Updates to the logger
  if (prettyLog && chalk.supportsColor) {
    UsePrettyLogger(is.object(prettyLog) ? prettyLog : undefined);
  }

  // * Set up the actual nest application
  let server: Express;
  const options = {
    cors,
    // Shh... no talky
    logger: nestNoopLogger ? NEST_NOOP_LOGGER : AutoLogService.nestLogger,
  };
  let app: INestApplication;
  try {
    if (httpEnabled) {
      server = express();
      app = await NestFactory.create(
        application,
        new ExpressAdapter(server),
        options,
      );
    } else {
      app = await NestFactory.create(application, options);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  if (init === false) {
    return app;
  }

  const logger = await app.resolve(AutoLogService);
  logger.setContext(LIB_BOILERPLATE, { name: "Bootstrap" });

  // * additional lifecycle events
  app.enableShutdownHooks();

  // * kick off the lifecycle
  const lifecycle = app.get(LifecycleService);
  const explorer = await app.resolve(LogExplorerService);

  logger.trace(`Pre loading log context`);
  explorer.load();

  // * preInit
  logger.trace(`preInit`);
  await eachSeries(preInit, async item => {
    await item(app, server, bootOptions);
  });
  await lifecycle.preInit(app, { options: bootOptions, server });

  // * init
  // onModuleCreate
  // onApplicationBootstrap
  logger.trace(`init`);
  await app.init();

  // * postInit
  logger.trace(`postInit`);
  await eachSeries(postInit, async item => {
    await item(app, server, bootOptions);
  });
  await lifecycle.postInit(app, { options: bootOptions, server });

  // ! done !
  return app;
}
