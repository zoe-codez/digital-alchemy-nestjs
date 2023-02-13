import { Injectable, Type } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { is } from "@steggy/utilities";
import { isProxy } from "util/types";

import { GetLogContext, LOGGER_LIBRARY } from "../../contracts";
import { AutoLogService } from "../auto-log.service";
// Crashy crashy if importing from directory

type AnnotationData<TYPE> = {
  context: string;
  data: TYPE;
  exec: (...pass_through: unknown[]) => Promise<void> | void;
  key: string;
};

type FindMethodsMap<TYPE> = Map<Record<string, Type>, AnnotationData<TYPE>[]>;

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

  public findAnnotatedMethods<TYPE>(search: string): FindMethodsMap<TYPE> {
    const providers = this.discovery.getProviders();
    const controllers = this.discovery.getControllers();
    const out = new Map() as FindMethodsMap<TYPE>;
    [...providers, ...controllers]
      .filter(wrapper => wrapper.instance)
      .map(wrapper => {
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
            const context = `${GetLogContext(instance)}#${key}`;
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
