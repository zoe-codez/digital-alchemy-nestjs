import { Inject, Injectable, Type } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { is } from "@steggy/utilities";
import { isProxy } from "util/types";

import {
  ACTIVE_APPLICATION,
  GetLogContext,
  LOGGER_LIBRARY,
} from "../../contracts";
import { AutoLogService } from "../auto-log.service";
// Crashy crashy if importing from directory

export type AnnotationPassThrough = (
  ...pass_through: unknown[]
) => Promise<void> | void;

type AnnotationData<TYPE> = {
  /**
   * Context string for logging. Format:
   *
   * > **library:Provider#method**
   */
  context: string;
  /**
   * Options provided to a single annotations
   */
  data: TYPE;
  /**
   * Method name
   */
  key: string;
};

type FindMethodsMap<TYPE> = Map<
  Record<string, Type>,
  (AnnotationData<TYPE> & {
    /**
     * Execute the method on the instance, with optional parameters
     */
    exec: AnnotationPassThrough;
  })[]
>;
type FindPropertiesMap<TYPE> = Map<
  Record<string, Type>,
  AnnotationData<TYPE>[]
>;

/**
 * The repo uses a standard of replacing the `@Injectable()` NestJS annotation with a specialized wrapper.
 * This makes it easy to do automatic registration of classes for certain processes.
 *
 * ModuleScannerService is used for looking up those providers.
 * It will return a map containing a reference to the provider, and the configuration info passed into the wrapper annotation
 */
@Injectable()
export class ModuleScannerService {
  constructor(
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly metadataScanner: MetadataScanner,
    private readonly logger: AutoLogService,
  ) {}

  public applicationProviders<T extends unknown = unknown>(): T[] {
    return this.getProviders<T>().filter(instance => {
      const ctor = instance.constructor;
      return ctor && !is.undefined(ctor[LOGGER_LIBRARY]);
    });
  }

  /**
   * Search out the application looking for methods that have been annotated with an annotation created from `MethodDecoratorFactory`
   *
   * Returns back a map a map that associates the provider with an array of all the instances of the annotation that were applied to it
   */
  public findAnnotatedMethods<TYPE>(
    search: string | { metadataKey: string },
  ): FindMethodsMap<TYPE> {
    search = is.string(search) ? search : search.metadataKey;
    const providers = this.discovery.getProviders();
    const controllers = this.discovery.getControllers();
    const out = new Map() as FindMethodsMap<TYPE>;
    [...providers, ...controllers]
      .filter(wrapper => wrapper.instance)
      .forEach(wrapper => {
        if (!wrapper.isDependencyTreeStatic() || !wrapper.instance) {
          return undefined;
        }
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance);
        if (!prototype || isProxy(instance)) {
          return undefined;
        }
        this.metadataScanner.scanFromPrototype(
          instance,
          prototype,
          (key: string) => {
            const list = this.reflector.get(search, instance[key]) as TYPE[];
            if (is.empty(list)) {
              return;
            }
            const current = out.get(instance) ?? [];
            const context = [
              GetLogContext(instance, this.application),
              key,
            ].join("#");
            const exec = async (...data) => {
              await instance[key].call(instance, ...data);
            };
            current.push(...list.map(data => ({ context, data, exec, key })));
            out.set(instance, current);
          },
        );
      });
    return out;
  }

  /**
   * Search out the application looking for methods that have been annotated with an annotation created from `MethodDecoratorFactory`
   *
   * Returns back a map a map that associates the provider with an array of all the instances of the annotation that were applied to it
   */
  public findAnnotatedProperties<TYPE>(
    search: string | { metadataKey: string },
  ): FindPropertiesMap<TYPE> {
    search = is.string(search) ? search : search.metadataKey;
    const providers = this.discovery.getProviders();
    const controllers = this.discovery.getControllers();
    const out = new Map() as FindPropertiesMap<TYPE>;
    [...providers, ...controllers]
      .filter(wrapper => wrapper.instance)
      .forEach(wrapper => {
        if (!wrapper.isDependencyTreeStatic() || !wrapper.instance) {
          return undefined;
        }
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance);
        if (!prototype || isProxy(instance)) {
          return undefined;
        }
        const list = this.reflector.get(search, instance) as {
          key: string;
          options: TYPE;
        }[];
        if (is.empty(list)) {
          return;
        }
        const current = out.get(instance) ?? [];
        current.push(
          ...list.map(({ options, key }) => ({
            context: [GetLogContext(instance, this.application), key].join("#"),
            data: options,
            key,
          })),
        );
        out.set(instance, current);
      });
    return out;
  }

  public findWithSymbol<
    VALUE extends unknown = unknown,
    PROVIDER_TYPE extends unknown = unknown,
  >(find: symbol): Map<PROVIDER_TYPE, VALUE> {
    const out = new Map();
    this.applicationProviders<PROVIDER_TYPE>().forEach(instance => {
      const ctor = instance.constructor;
      if (!ctor) {
        return;
      }
      if (!is.undefined(ctor[find])) {
        out.set(instance, ctor[find]);
      }
    });
    return out;
  }

  public getProviders<T extends unknown = unknown>(): T[] {
    return [
      ...this.discovery.getControllers(),
      ...this.discovery.getProviders(),
    ]
      .filter(wrapper => {
        if (!wrapper.instance) {
          return false;
        }
        return true;
      })
      .map(wrapper => wrapper.instance);
  }
}
