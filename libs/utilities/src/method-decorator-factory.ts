import { Class } from "type-fest";

import { is } from "./is";

type PassThroughCallback = (...pass_through: unknown[]) => void | Promise<void>;

interface DynamicAttach<OPTIONS> {
  (options: OPTIONS, callback?: PassThroughCallback): AttachMethodDecorator;
}

export type AttachMethodDecorator = MethodDecorator & {
  pipe: (callback: PassThroughCallback) => void;
};
type Decorator<OPTIONS extends unknown = unknown> = DynamicAttach<OPTIONS>;

export type GET_ANNOTATION_OPTIONS<ANNOTATION> =
  ANNOTATION extends CompleteAnnotation<infer OPTIONS> ? OPTIONS : never;

export type GET_CLASS_TYPE<ANNOTATION> = ANNOTATION extends CompleteAnnotation<
  unknown,
  infer CLASS_TYPE
>
  ? CLASS_TYPE
  : never;

/**
 * ## Use as `MethodDecorator`
 *
 * This derives from a basic method decorator, and can be used on any long lived provider
 *
 * ```typescript
 * const ExampleDecorator = MethodDecoratorFactory<{ sensor: `sensor.${string}` }>("EXAMPLE_BINDING_KEY")
 *
 * export class MyProvider {
 *
 * >> @ExampleDecorator({ sensor: "sensor.hello_world" }) << // Use on class method
 * >> @ExampleDecorator({ sensor: "sensor.sleepy_time" }) << // More than once if desired
 *    receiveEvent() {
 *      console.log("hit!")
 *    }
 *
 * }
 * ```
 *
 * ## Dynamic binding
 *
 * Dynamic bindings work through an EventEmitter pattern.
 * Use `MyDecorator.onEvent(options)` to generate a unique event string.
 * This event string can be re-used with
 *
 * ```typescript
 * import EventEmitter from "eventemitter3";
 *
 * const ExampleDecorator = MethodDecoratorFactory<{ sensor: `sensor.${string}` }>("EXAMPLE_BINDING_KEY")
 *
 * export class MyProvider {
 *   constructor(private readonly event: EventEmitter){}
 *
 *   protected onModuleInit(): void {
 *     const eventId = ExampleDecorator.onEvent({ sensor: "sensor.hello_world" });
 *     this.event.on(evenId, () => {
 *       console.log("HIT");
 *     })
 *   }
 * }
 * ```
 */
export type CompleteAnnotation<
  OPTIONS,
  CLASS_TYPE extends unknown = unknown,
> = Decorator<OPTIONS> & {
  /**
   * Internal use - purely for keeping the linter happy and making the infer work
   */
  classTypePassthrough?: CLASS_TYPE;
  /**
   * Internal use
   */
  metadataKey: string;
  catchUp(stream: (options: tFF<OPTIONS>) => void): void;
};

type tFF<OPTIONS> = {
  callback: PassThroughCallback;
  options: OPTIONS;
};

/**
 * For generating configurable annotations that can be applied to methods
 *
 * These annotations can be scanned for using `ModuleScannerService.findAnnotatedMethods(metadataKey)` provided by `@steggy/boilerplate`
 */
export function MethodDecoratorFactory<
  OPTIONS,
  CLASS_TYPE extends Class<object> = Class<object>,
>(metadataKey: string): CompleteAnnotation<OPTIONS, CLASS_TYPE> {
  const fastForwardEvents = [] as tFF<OPTIONS>[];
  const watchStreams = [] as ((options: tFF<OPTIONS>) => void)[];

  // * Annotation (without attached methods)
  const decoratorWithConfig = function (
    options: OPTIONS,
    exec?: PassThroughCallback,
  ) {
    // * User is using this as an annotation
    const attachAnnotation = function (target, key, descriptor) {
      const data: OPTIONS[] =
        Reflect.getMetadata(metadataKey, descriptor.value) ?? [];
      data.push(options);
      Reflect.defineMetadata(metadataKey, data, descriptor.value);
      return descriptor;
    };
    attachAnnotation.pipe = (exec: PassThroughCallback) => {
      const event = { callback: exec, options };
      fastForwardEvents.push(event);
      watchStreams.forEach(stream => stream(event));
    };
    // ? If a callback is passed, then it should be run in the same circumstances as an annotated method
    // The annotation is NOT returned
    if (is.function(exec)) {
      attachAnnotation.pipe(exec);
    }
    return attachAnnotation;
  };
  // * Attach the decorator key for later lookup
  decoratorWithConfig.metadataKey = metadataKey;

  // * Run catchUp method for all current event receiver functions
  // If any additional arrive in the future, they will also be provided
  decoratorWithConfig.catchUp = (stream: (options: tFF<OPTIONS>) => void) => {
    watchStreams.push(stream);
    fastForwardEvents.forEach(event => stream(event));
  };
  return decoratorWithConfig;
}
