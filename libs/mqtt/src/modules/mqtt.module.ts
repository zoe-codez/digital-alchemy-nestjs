import { LibraryModule } from "@digital-alchemy/boilerplate";
import { DiscoveryModule } from "@nestjs/core";
import { IClientOptions } from "mqtt";

import { CLIENT_OPTIONS, LIB_MQTT } from "../config";
import { MQTT_CLIENT_INSTANCE } from "../contracts";
import {
  MQTTClientInstanceService,
  MQTTExplorerService,
  MqttService,
} from "../services";

@LibraryModule({
  configuration: {
    [CLIENT_OPTIONS]: {
      default: {
        host: "localhost",
        password: undefined,
        port: 1883,
      } as IClientOptions,
      description: "See IClientOptions in mqtt npm package",
      type: "internal",
    },
  },
  exports: [MqttService, MQTT_CLIENT_INSTANCE],
  imports: [DiscoveryModule],
  library: LIB_MQTT,
  providers: [
    MQTTClientInstanceService,
    {
      inject: [MQTTClientInstanceService],
      provide: MQTT_CLIENT_INSTANCE,
      useFactory: (instance: MQTTClientInstanceService) =>
        instance.createConnection(),
    },
    MQTTExplorerService,
    MqttService,
  ],
})
export class MQTTModule {}
