import { SensorDeviceClasses } from "./sensor-device-class";

type Icon = string;

type SensorConfig = {
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

type SwitchConfig = {
  entity_picture_template?: string;
  icon_template?: string;
  name: string;
  state_class: "measurement" | "total" | "total_increasing";
  /**
   * Set up a unique_id for this sensor
   */
  track_history?: boolean;
};

export interface HomeAssistantModuleConfiguration {
  generate_entities?: {
    sensors?: Record<string, SensorConfig>;
    switches?: Record<string, SwitchConfig>;
  };
}
