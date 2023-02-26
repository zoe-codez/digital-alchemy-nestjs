type PassThroughCallback = (...pass_through: unknown[]) => void | Promise<void>;
// type DynamicAttach<OPTIONS> = (
//   options: OPTIONS,
//   callback: PassThroughCallback,
// ) => void;

interface DynamicAttach<OPTIONS> {
  (options: OPTIONS, callback: PassThroughCallback): void;
}
interface DecoratorAttach<OPTIONS> {
  (options: OPTIONS): AttachMethodDecorator;
}

export type AttachMethodDecorator = MethodDecorator & {
  pipe: (callback: PassThroughCallback) => void;
};
type Decorator<
  DECORATOR extends DecoratorAttach<OPTIONS> | DynamicAttach<OPTIONS>,
  OPTIONS extends unknown = unknown,
> = DECORATOR extends DynamicAttach<OPTIONS>
  ? DynamicAttach<OPTIONS>
  : DecoratorAttach<OPTIONS>;

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
  catchUp: (callback: ConfiguredCallback) => void;
  /**
   * Internal use - purely for keeping the linter happy and making the infer work
   */
  classTypePassthrough?: CLASS_TYPE;
  /**
   * Internal use
   */
  metadataKey: string;
};

type ConfiguredCallback =
  | PassThroughCallback
  | {
      callback: PassThroughCallback;
      context: string;
    };
type tFF<OPTIONS> = {
  callback: ConfiguredCallback;
  options: OPTIONS;
};

/**
 * For generating configurable annotations that can be applied to methods
 *
 * These annotations can be scanned for using `ModuleScannerService.findAnnotatedMethods(metadataKey)` provided by `@steggy/boilerplate`
 */
export function MethodDecoratorFactory<
  OPTIONS,
  CLASS_TYPE extends unknown = unknown,
>(metadataKey: string): CompleteAnnotation<OPTIONS, CLASS_TYPE> {
  const fastForwardEvents = [] as tFF<OPTIONS>[];
  type ffCallback = (options: tFF<OPTIONS>) => void;
  const watchStreams = [] as ffCallback[];
  const out = function (
    // configuration
    options: OPTIONS,
    //
    exec?: ConfiguredCallback,
  ) {
    if (exec) {
      fastForwardEvents.forEach(i => {
        //
      });
      return;
    }
    const attachAnnotation = function (target, key, descriptor) {
      const data: OPTIONS[] =
        Reflect.getMetadata(metadataKey, descriptor.value) ?? [];
      data.push(options);
      Reflect.defineMetadata(metadataKey, data, descriptor.value);
      return descriptor;
    };
    attachAnnotation.pipe = (callback: PassThroughCallback) => {
      fastForwardEvents.push({ callback, options });
      watchStreams.forEach(runtime => runtime({ callback, options }));
    };
    return attachAnnotation;
  };
  out.catchUp = (callback: ffCallback) => {
    //
  };
  out.metadataKey = metadataKey;
  return out;
}
const decorator = MethodDecoratorFactory<boolean>("");
const result = decorator(true, () => {
  //
});
class Test {
  doStuff() {
    //
  }
}
