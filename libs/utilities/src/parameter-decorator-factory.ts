import {
  ClassProvider,
  ExistingProvider,
  FactoryProvider,
  Inject,
  ValueProvider,
} from "@nestjs/common";

type Decorator<OPTIONS> = (options: OPTIONS) => ParameterDecorator;
type CompleteAnnotation<OPTIONS, BUILT> = Decorator<OPTIONS> & {
  providers: BUILT[];
};
type ExpectedProviders<T = unknown> =
  | FactoryProvider<T>
  | ExistingProvider<T>
  | ValueProvider<T>
  | ClassProvider<T>;

/**
 * For generating configurable annotations that can be applied to methods
 *
 * These annotations can be scanned for using `ModuleScannerService.findAnnotatedMethods(metadataKey)` provided by `@steggy/boilerplate`
 */
export function ParameterDecoratorFactory<
  OPTIONS,
  BUILT extends ExpectedProviders = ExpectedProviders,
>(
  transform: (
    data: OPTIONS,
    target: unknown,
    key: string,
    index: number,
  ) => BUILT,
): CompleteAnnotation<OPTIONS, BUILT> {
  const decorator = function (options: OPTIONS): ParameterDecorator {
    return function (target, key: string, index: number) {
      const out = transform(options, target, key, index);
      decorator.providers.push(out);
      return Inject(out.provide)(target, key, index);
    };
  } as CompleteAnnotation<OPTIONS, BUILT>;
  decorator.providers = [];
  return decorator;
}
