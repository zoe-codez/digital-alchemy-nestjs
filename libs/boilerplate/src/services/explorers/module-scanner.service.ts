import { Injectable } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { is } from "@steggy/utilities";

import { LOGGER_LIBRARY } from "../../contracts";
// Crashy crashy if importing from directory

/**
 * The repo uses a standard of replacing the `@Injectable()` NestJS annotation with a specialized wrapper.
 * This makes it easy to do automatic registration of classes for certain processes.
 *
 * ModuleScannerService is used for looking up those providers.
 * It will return a map containing a reference to the provider, and the configuration info passed into the wrapper annotation
 */
@Injectable()
export class ModuleScannerService {
  constructor(private readonly discovery: DiscoveryService) {}

  public applicationProviders<T extends unknown = unknown>(): T[] {
    return this.getProviders<T>().filter(instance => {
      const ctor = instance.constructor;
      return ctor && !is.undefined(ctor[LOGGER_LIBRARY]);
    });
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
