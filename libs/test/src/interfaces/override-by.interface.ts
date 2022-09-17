/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestingModuleBuilder } from "../module-builder";
import { OverrideByFactoryOptions } from "./override-by-factory-options.interface";

export interface OverrideBy {
  useClass: (metatype: any) => TestingModuleBuilder;
  useFactory: (options: OverrideByFactoryOptions) => TestingModuleBuilder;
  useValue: (value: any) => TestingModuleBuilder;
}
