type Decorator<OPTIONS> = (options: OPTIONS) => MethodDecorator;
type CompleteAnnotation<OPTIONS> = Decorator<OPTIONS> & {
  metadataKey: string;
};

/**
 * For generating configurable annotations that can be applied to methods
 *
 * These annotations can be scanned for using `ModuleScannerService.findAnnotatedMethods(metadataKey)` provided by `@steggy/boilerplate`
 */
export function MethodDecoratorFactory<OPTIONS>(
  metadataKey: string,
): CompleteAnnotation<OPTIONS> {
  const out = function (options: OPTIONS) {
    return function (target, key, descriptor) {
      const data: OPTIONS[] =
        Reflect.getMetadata(metadataKey, descriptor.value) ?? [];
      data.push(options);
      Reflect.defineMetadata(metadataKey, data, descriptor.value);
      return descriptor;
    };
  };
  out.metadataKey = metadataKey;
  return out;
}
