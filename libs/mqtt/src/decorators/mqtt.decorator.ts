import { MethodDecoratorFactory } from "@steggy/utilities";

import { MqttSubscribeOptions } from "../contracts";

export interface AnnotatedMQTTSubscription {
  options: MqttSubscribeOptions;
  topic: string[];
}
export const OnMQTT = MethodDecoratorFactory<MqttSubscribeOptions>(
  "MQTT_SUBSCRIBE_OPTIONS",
);
