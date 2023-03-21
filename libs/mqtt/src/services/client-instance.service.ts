import { Injectable } from "@nestjs/common";
import { InjectConfig } from "@digital-alchemy/boilerplate";
import { connect, IClientOptions, MqttClient } from "mqtt";

import { CLIENT_OPTIONS } from "../config";

@Injectable()
export class MQTTClientInstanceService {
  constructor(
    @InjectConfig(CLIENT_OPTIONS) private readonly options: IClientOptions,
  ) {}
  private client: MqttClient;

  public createConnection(): MqttClient {
    if (this.client) {
      return this.client;
    }
    this.client = connect(this.options);
    return this.client;
  }
}
