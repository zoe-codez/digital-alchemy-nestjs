/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OverrideByFactoryOptions {
  factory: (...arguments_: any[]) => any;
  inject?: any[];
}
