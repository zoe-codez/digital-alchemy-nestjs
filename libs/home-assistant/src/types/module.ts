import { SensorDeviceClasses } from "./sensor-device-class";
import { Icon, Timer } from "./template";
import { ALL_GENERATED_SERVICE_DOMAINS } from "./utility";

type SensorValueType = string;

export type SensorConfig = {
  attributes?: Record<string, SensorValueType>;
  auto_off?: Timer;
  delay_off?: Timer;
  delay_on?: Timer;
} & SensorDeviceClasses &
  BaseConfig;

/**
 * TODO: VALIDATE ME
 */
export type BinarySensorConfig = {
  attributes?: Record<string, SensorValueType>;
  auto_off?: Timer;
  delay_off?: Timer;
  delay_on?: Timer;
} & SensorDeviceClasses &
  BaseConfig;

export type BaseConfig = {
  icon?: Icon;
  name?: string;
  track_history?: boolean;
};

export type SwitchConfig = BaseConfig;
export type ButtonConfig = BaseConfig;

export interface HomeAssistantModuleConfiguration<
  BINARY_SENSORS extends string = string,
  SENSORS extends string = string,
  SWITCHES extends string = string,
> {
  generate_entities?: {
    binary_sensor?: Record<BINARY_SENSORS, BinarySensorConfig>;
    button?: Record<SWITCHES, ButtonConfig>;
    sensor?: Record<SENSORS, SensorConfig>;
    switch?: Record<SWITCHES, SwitchConfig>;
  };
}

type configDomainMap = {
  binary_sensor: BinarySensorConfig;
  button: ButtonConfig;
  sensor: SensorConfig;
  switch: SwitchConfig;
};

export type GET_CONFIG<DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> =
  configDomainMap[DOMAIN];
