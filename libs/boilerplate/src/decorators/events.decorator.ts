export const EVENT_LISTENER_METADATA = "EVENT_LISTENER_METADATA";
type EventList = { event: Array<string | symbol> };

/**
 * Event listener decorator.
 * Subscribes to events based on the specified name(s).
 */
export function OnEvent(...event: Array<string | symbol>): MethodDecorator {
  return function (target, key, descriptor) {
    const data = (Reflect.getMetadata(
      EVENT_LISTENER_METADATA,
      descriptor.value,
    ) as EventList) || { event: [] };
    Reflect.defineMetadata(
      EVENT_LISTENER_METADATA,
      { event: [...data.event, ...event] },
      descriptor.value,
    );
    return descriptor;
  };
}

export class OnEventMetadata {
  /**
   * Event (name or pattern) to subscribe to.
   */
  public event: string | symbol | string[];
}
