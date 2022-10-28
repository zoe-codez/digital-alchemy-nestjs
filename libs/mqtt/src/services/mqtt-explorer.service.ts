import { Injectable } from "@nestjs/common";
import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { AutoLogService, GetLogContext } from "@steggy/boilerplate";
import { is } from "@steggy/utilities";
import EventEmitter from "eventemitter3";
import { Client } from "mqtt";

import {
  MQTT_CLOSE,
  MQTT_CONNECT,
  MQTT_DISCONNECT,
  MQTT_ERROR,
  MQTT_OFFLINE,
  MQTT_RECONNECT,
  MqttSubscribeOptions,
  MqttSubscriber,
} from "../contracts";
import { InjectMQTT, MQTT_SUBSCRIBE_OPTIONS } from "../decorators";
import { MqttService } from "./mqtt.service";

const FIRST = 0;

@Injectable()
export class MQTTExplorerService {
  private static matchGroups(string: string, regex: RegExp) {
    regex.lastIndex = 0;
    let m = regex.exec(string);
    const matches: string[] = [];

    while (m !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex !== FIRST) {
          matches.push(match);
        }
      });
      m = regex.exec(string);
    }
    return matches;
  }

  private static topicToRegexp(topic: string) {
    // compatible with mqtt
    return new RegExp(
      "^" +
        topic
          .replace("$queue/", "")
          .replace(/^\$share\/([\dA-Za-z]+)\//, "")
          .replace(/([$()*.?[\\\]^|])/g, "\\$1")
          .replace(/\+/g, "([^/]+)")
          .replace(/\/#$/, "(/.*)?") +
        "$",
      "y",
    );
  }

  constructor(
    private readonly logger: AutoLogService,
    @InjectMQTT() private readonly client: Client,
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly mqtt: MqttService,
    private readonly eventEmitter: EventEmitter,
  ) {}

  public subscribers: MqttSubscriber[] = [];

  protected onApplicationBootstrap(): void {
    const providers: InstanceWrapper[] = this.discovery.getProviders();
    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;
      if (!instance) {
        return;
      }
      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        key => {
          const proto = instance?.__proto__;
          if (!proto) {
            return;
          }
          const subscribeOptions: MqttSubscribeOptions =
            proto[key][MQTT_SUBSCRIBE_OPTIONS];

          if (subscribeOptions) {
            const topics = is.string(subscribeOptions.topic)
              ? [subscribeOptions.topic]
              : subscribeOptions.topic;
            topics.forEach(topic => {
              this.logger.debug(
                `${GetLogContext(instance)}#${key} subscribe {${topic}}`,
              );
              this.mqtt.subscribe(
                topic,
                async (value, packet) => {
                  await instance[key](value, { packet, topic });
                },
                subscribeOptions,
              );
            });
          }
        },
      );
    });
  }

  protected onModuleInit(): void {
    const client = this.client;

    client.on("connect", () => {
      this.logger.info("🔊 MQTT connected 🔊");
      this.eventEmitter.emit(MQTT_CONNECT);
    });

    client.on("disconnect", packet => {
      this.logger.warn({ packet }, "MQTT disconnected");
      this.eventEmitter.emit(MQTT_DISCONNECT);
    });

    client.on("error", error => {
      this.logger.error({ error }, "MQTT error");
      this.eventEmitter.emit(MQTT_ERROR);
    });

    client.on("reconnect", () => {
      this.logger.debug("MQTT reconnecting");
      this.eventEmitter.emit(MQTT_RECONNECT);
    });

    client.on("close", () => {
      this.logger.debug("MQTT closed");
      this.eventEmitter.emit(MQTT_CLOSE);
    });

    client.on("offline", () => {
      this.logger.warn("MQTT offline");
      this.eventEmitter.emit(MQTT_OFFLINE);
    });
  }
}
