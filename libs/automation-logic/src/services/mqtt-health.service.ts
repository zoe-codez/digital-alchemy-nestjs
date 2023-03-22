import { Inject, Injectable } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AutoLogService,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import { MqttService } from "@digital-alchemy/mqtt";
import { SECOND } from "@digital-alchemy/utilities";

import { MQTT_TOPIC_PREFIX } from "../config";

const HEALTH_CHECK_INTERVAL = 10;

@Injectable()
export class MQTTHealth {
  constructor(
    private readonly logger: AutoLogService,
    private readonly mqtt: MqttService,
    @Inject(ACTIVE_APPLICATION) private readonly application: string,
    @InjectConfig(MQTT_TOPIC_PREFIX)
    private readonly prefix: string,
  ) {
    this.topic = `${this.prefix}/${this.application}/online`;
  }

  public get availability() {
    return [
      {
        payload_available: "online",
        topic: this.topic,
      },
    ];
  }

  private readonly topic: string;

  protected onApplicationBootstrap() {
    setInterval(() => {
      this.logger.trace("🤖 still alive");
      this.mqtt.publish(this.topic, "online");
    }, HEALTH_CHECK_INTERVAL * SECOND);
  }
}
