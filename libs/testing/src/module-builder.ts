import {
  ApplicationModule,
  Bootstrap,
  NEST_NOOP_LOGGER,
  QuickScriptOptions,
} from "@digital-alchemy/boilerplate";
import { INestApplicationContext, Logger } from "@nestjs/common";
import {
  ApplicationConfig,
  GraphInspector,
  MetadataScanner,
  NestContainer,
} from "@nestjs/core";
import { DependenciesScanner } from "@nestjs/core/scanner";
import { TestingInjector } from "@nestjs/testing/testing-injector";
import { TestingInstanceLoader } from "@nestjs/testing/testing-instance-loader";
import { ClassConstructor } from "class-transformer";

import {
  MockFactory,
  OverrideBy,
  OverrideByFactoryOptions,
} from "./interfaces";

export class TestingModuleBuilder {
  constructor(
    metadataScanner: MetadataScanner,
    private readonly metadata: QuickScriptOptions,
  ) {
    const graph = new GraphInspector(this.container);
    this.scanner = new DependenciesScanner(
      this.container,
      metadataScanner,
      graph,
      this.applicationConfig,
    );
    this.module = this.createModule(metadata);
    this.instanceLoader = new TestingInstanceLoader(
      this.container,
      new TestingInjector({
        preview: false,
      }),
      graph,
    );
  }

  private readonly applicationConfig = new ApplicationConfig();
  private readonly container = new NestContainer(this.applicationConfig);
  private readonly instanceLoader: TestingInstanceLoader;
  private mocker?: MockFactory;
  private readonly module: ClassConstructor<unknown>;
  private readonly overloadsMap = new Map();
  private readonly scanner: DependenciesScanner;

  public async compile(): Promise<INestApplicationContext> {
    Logger.overrideLogger(NEST_NOOP_LOGGER);
    await this.scanner.scan(this.module);

    this.applyOverloadsMap();
    await this.instanceLoader.createInstancesOfDependencies(
      this.container.getModules(),
      this.mocker,
    );
    this.scanner.applyApplicationProviders();
    return Bootstrap(this.module, this.metadata.bootstrap);
  }

  public overrideFilter<T = unknown>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideGuard<T = unknown>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideInterceptor<T = unknown>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overridePipe<T = unknown>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, false);
  }

  public overrideProvider<T = unknown>(typeOrToken: T): OverrideBy {
    return this.override(typeOrToken, true);
  }

  public useMocker(mocker: MockFactory): TestingModuleBuilder {
    this.mocker = mocker;
    return this;
  }

  private applyOverloadsMap() {
    [...this.overloadsMap.entries()].forEach(([item, options]) => {
      this.container.replace(item, options);
    });
  }

  private createModule(
    metadata: QuickScriptOptions,
  ): ClassConstructor<unknown> {
    class RootTestModule {}
    return ApplicationModule(metadata)(
      RootTestModule,
    ) as ClassConstructor<unknown>;
  }

  private createOverrideByBuilder(
    add: (provider: unknown) => TestingModuleBuilder,
  ): OverrideBy {
    return {
      useClass: metatype => add({ useClass: metatype }),
      useFactory: (options: OverrideByFactoryOptions) =>
        add({ ...options, useFactory: options.factory }),
      useValue: value => add({ useValue: value }),
    };
  }

  private override<T = unknown>(
    typeOrToken: T,
    isProvider: boolean,
  ): OverrideBy {
    const addOverload = (options: object) => {
      this.overloadsMap.set(typeOrToken, {
        ...options,
        isProvider,
      });
      return this;
    };
    return this.createOverrideByBuilder(addOverload);
  }
}
