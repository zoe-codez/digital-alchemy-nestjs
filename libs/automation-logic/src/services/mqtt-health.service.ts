import { Inject, Injectable } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AutoLogService,
  Cron,
  InjectConfig,
} from "@steggy/boilerplate";
import { MqttService } from "@steggy/mqtt";
import { CronExpression } from "@steggy/utilities";

import { MQTT_TOPIC_PREFIX } from "../config";

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

  @Cron(CronExpression.EVERY_10_SECONDS)
  protected sendHealthCheck() {
    this.logger.trace("🤖 still alive");
    this.mqtt.publish(this.topic, "online");
  }
}
