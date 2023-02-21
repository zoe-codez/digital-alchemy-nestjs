import { SensorDeviceClasses } from "./sensor-device-class";
import { Icon, Timer } from "./template";

type SensorValueType = string;

export type SensorConfig = {
  attributes: Record<string, SensorValueType>;
  auto_off?: Timer;
  delay_off?: Timer;
  delay_on?: Timer;
  /**
   * Icon for the scene.
   */
  icon?: Icon;
  /**
   * The name to use when displaying this scene.
   */
  name?: string;
  /**
   * Set up a unique_id for this sensor
   */
  track_history?: boolean;
} & SensorDeviceClasses;

export type SwitchConfig = {
  entity_picture_template?: string;
  icon_template?: string;
  name: string;
  state_class: "measurement" | "total" | "total_increasing";
  /**
   * Set up a unique_id for this sensor
   */
  track_history?: boolean;
};

export interface HomeAssistantModuleConfiguration<
  SENSORS extends string = string,
  SWITCHES extends string = string,
> {
  generate_entities?: {
    sensors?: Record<SENSORS, SensorConfig>;
    switches?: Record<SWITCHES, SwitchConfig>;
  };
}
