import { MethodDecoratorFactory } from "../includes";

export type OnEventOptions = string | { events: string[] };

/**
 * Event listener decorator.
 * Subscribes to events based on the specified name(s).
 */
export const OnEvent = MethodDecoratorFactory<OnEventOptions>(
  "EVENT_LISTENER_METADATA",
);
