type Decorator<OPTIONS> = (options: OPTIONS) => PropertyDecorator;
type CompleteAnnotation<OPTIONS> = Decorator<OPTIONS> & {
  metadataKey: string;
};

/**
 * For generating configurable annotations that can be applied to methods
 *
 * These annotations can be scanned for using `ModuleScannerService.findAnnotatedMethods(metadataKey)` provided by `@digital-alchemy/boilerplate`
 */
export function PropertyDecoratorFactory<OPTIONS>(
  metadataKey: string,
): CompleteAnnotation<OPTIONS> {
  const out = function (options: OPTIONS): PropertyDecorator {
    return function (target, key: string) {
      const data: { key: string; options: OPTIONS }[] =
        Reflect.getMetadata(metadataKey, target) ?? [];
      data.push({ key, options });
      Reflect.defineMetadata(metadataKey, data, target);
    };
  };
  out.metadataKey = metadataKey;
  return out;
}
