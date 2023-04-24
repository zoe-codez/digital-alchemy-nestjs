import { Injectable } from "@nestjs/common";

export const COMPONENT_CONFIG = Symbol.for("editor");

export interface ComponentOptions {
  type: string;
}

export function Component(options: ComponentOptions): ClassDecorator {
  return function (target) {
    target[COMPONENT_CONFIG] = options;
    return Injectable()(target);
  };
}

export type ComponentDoneCallback<
  VALUE_TYPE = unknown,
  CANCEL extends unknown = never,
> = (type?: VALUE_TYPE | VALUE_TYPE[] | CANCEL) => void;

export interface iComponent<
  CONFIG = unknown,
  VALUE = unknown,
  CANCEL extends unknown = never,
> {
  value?: VALUE;
  configure(config: CONFIG, done: ComponentDoneCallback<VALUE, CANCEL>): void;
  onEnd(abort: boolean): void;
  render(): void;
}
