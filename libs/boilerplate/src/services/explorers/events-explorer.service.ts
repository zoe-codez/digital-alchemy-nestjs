import { Injectable, Type } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { is } from "@steggy/utilities";
import EventEmitter from "eventemitter3";
import { isProxy } from "util/types";

import { LOG_CONTEXT } from "../../contracts";
import {
  EVENT_LISTENER_METADATA,
  OnEventMetadata,
} from "../../decorators/events.decorator";
import { AutoLogService } from "../auto-log.service";

/**
 * Search out all the methods that were annotated with `@OnEvent`, and set up subscriptions
 */
@Injectable()
export class EventsExplorerService {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly eventEmitter: EventEmitter,
    private readonly logger: AutoLogService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  public getEventHandlerMetadata(
    target: Type<unknown>,
  ): OnEventMetadata | undefined {
    return this.reflector.get(EVENT_LISTENER_METADATA, target);
  }

  public loadEventListeners(): void {
    const providers = this.discovery.getProviders();
    const controllers = this.discovery.getControllers();
    [...providers, ...controllers]
      .filter(wrapper => wrapper.isDependencyTreeStatic())
      .filter(wrapper => wrapper.instance)
      .forEach((wrapper: InstanceWrapper) => {
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance);
        // console.log(prototype);
        if (!prototype || isProxy(instance)) {
          return;
        }
        this.metadataScanner.scanFromPrototype(
          instance,
          prototype,
          (key: string) => {
            this.subscribe(instance, key);
          },
        );
      });
  }

  protected onApplicationBootstrap(): void {
    this.loadEventListeners();
  }

  protected onApplicationShutdown(): void {
    this.eventEmitter.removeAllListeners();
  }

  private subscribe<T extends Record<string, Type>>(instance: T, key: string) {
    const eventListenerMetadata = this.getEventHandlerMetadata(instance[key]);
    if (!eventListenerMetadata) {
      return;
    }
    const { event } = eventListenerMetadata;
    const context = instance.constructor[LOG_CONTEXT];
    const list = Array.isArray(event) ? event : [event];
    this.logger.debug(
      `${context}#${key} event subscribe ${list
        .map(i => `{${is.string(i) ? i : i.description}}`)
        .join(", ")}`,
    );
    (Array.isArray(event) ? event : [event]).forEach(event =>
      this.eventEmitter.on(event, (...parameters: unknown[]) =>
        instance[key].call(instance, ...parameters),
      ),
    );
  }
}
