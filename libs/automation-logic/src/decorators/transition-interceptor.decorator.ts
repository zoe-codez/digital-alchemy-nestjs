export interface MethodTransition<SCENES extends string = string> {
  /**
   * Run if scene matches.
   * "*" = default value & match all
   */
  from?: SCENES | "*";
  method: string;
  /**
   * Run if scene matches.
   * "*" = default value & match all
   */
  to?: SCENES | "*";
}

const metadataKey = "SCENE_ROOM_TRANSITIONS";
/**
 * Method transitions override definitions in the scene options
 *
 * Method should either return void, or replacement scene target name (act as a redirect).
 * Transitions ARE run recursively
 */
export function SceneTransitionInterceptor<SCENES extends string = string>(
  options: Omit<MethodTransition<SCENES>, "method"> = {},
): MethodDecorator {
  return function (target, method, descriptor) {
    const data: Omit<MethodTransition<SCENES>, "method">[] =
      Reflect.getMetadata(metadataKey, descriptor.value) ?? [];
    data.push(options);
    Reflect.defineMetadata(metadataKey, data, descriptor.value);
    return descriptor;
  };
}
SceneTransitionInterceptor.metadataKey = metadataKey;
