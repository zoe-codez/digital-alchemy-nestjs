import { Client } from "mqtt";
export * from "./client-instance.service";
export * from "./mqtt.service";
export * from "./mqtt-explorer.service";
/**
 * Use with `@InjectMQTT()`
 */
// eslint-disable-next-line unicorn/prefer-export-from
export const MqttClientService = Client;
