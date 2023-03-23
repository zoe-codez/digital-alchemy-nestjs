import {
  AutoLogService,
  ModuleScannerService,
} from "@digital-alchemy/boilerplate";
import { Injectable } from "@nestjs/common";
import EventEmitter from "eventemitter3";
import { Client } from "mqtt";

import { MqttEvents, MqttSubscribeOptions, MqttSubscriber } from "../contracts";
import { InjectMQTT, OnMQTT } from "../decorators";
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
    private readonly mqtt: MqttService,
    private readonly eventEmitter: EventEmitter,
    private readonly scanner: ModuleScannerService,
  ) {}

  public subscribers: MqttSubscriber[] = [];

  protected onApplicationBootstrap(): void {
    this.scanner.bindMethodDecorator<MqttSubscribeOptions>(
      OnMQTT,
      ({ data, exec, context }) => {
        const topics = [data.topic].flat();
        this.logger.info({ context }, `[@OnMQTT] {%s topics}`, topics.length);
        topics.forEach(topic => {
          this.logger.debug({ context }, ` - {%s}`, topic);
          this.mqtt.subscribe(
            topic,
            async (value, packet) => {
              this.logger.trace({ context }, `OnMQTT {%s}`, topic);
              await exec(value, { packet, topic });
            },
            data,
          );
        });
      },
    );
  }

  protected onModuleInit(): void {
    const client = this.client;

    client.on("connect", () => {
      this.logger.info("🔊 MQTT connected 🔊");
      this.eventEmitter.emit(MqttEvents.connect);
    });

    client.on("disconnect", packet => {
      this.logger.warn({ packet }, "MQTT disconnected");
      this.eventEmitter.emit(MqttEvents.disconnect);
    });

    client.on("error", error => {
      this.logger.error({ error }, "MQTT error");
      this.eventEmitter.emit(MqttEvents.error);
    });

    client.on("reconnect", () => {
      this.logger.debug("MQTT reconnecting");
      this.eventEmitter.emit(MqttEvents.reconnect);
    });

    client.on("close", () => {
      this.logger.debug("MQTT closed");
      this.eventEmitter.emit(MqttEvents.close);
    });

    client.on("offline", () => {
      this.logger.warn("MQTT offline");
      this.eventEmitter.emit(MqttEvents.offline);
    });
  }
}
