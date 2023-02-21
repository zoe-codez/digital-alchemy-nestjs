import { SensorDeviceClasses } from "./sensor-device-class";
import { Icon, Timer } from "./template";

type SensorValueType = string;

export type SensorConfig = {
  attributes: Record<string, SensorValueType>;
  auto_off?: Timer;
  delay_off?: Timer;
  delay_on?: Timer;
  icon?: Icon;
  name?: string;
  track_history?: boolean;
} & SensorDeviceClasses;

/**
 * TODO: VALIDATE ME
 */
export type BinarySensorConfig = {
  attributes: Record<string, SensorValueType>;
  auto_off?: Timer;
  delay_off?: Timer;
  delay_on?: Timer;
  icon?: Icon;
  name?: string;
  track_history?: boolean;
} & SensorDeviceClasses;

export type SwitchConfig = {
  icon?: Icon;
  name?: string;
  track_history?: boolean;
};

export interface HomeAssistantModuleConfiguration<
  BINARY_SENSORS extends string = string,
  SENSORS extends string = string,
  SWITCHES extends string = string,
> {
  generate_entities?: {
    binary_sensors?: Record<BINARY_SENSORS, BinarySensorConfig>;
    sensors?: Record<SENSORS, SensorConfig>;
    switches?: Record<SWITCHES, SwitchConfig>;
  };
}
