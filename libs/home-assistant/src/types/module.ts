import { SensorDeviceClasses } from "./sensor-device-class";
import { Icon, Template, Timer } from "./template";

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
  availability?: Template;
  icon?: Icon;
  name?: string;
  track_history?: boolean;
};

export type SwitchConfig = {
  /**
   * ## if true
   *
   * Switch will automatically initialize, and be available for use and normal comparisons via standard websocket commands.
   *
   * ## if false
   *
   * Switch will not be created unless
   *
   * > **default**: false
   */
  autoInit?: boolean;
} & BaseConfig;
export type ButtonConfig = BaseConfig;

export interface HomeAssistantModuleConfiguration {
  controllers?: boolean;
  generate_entities?: {
    /**
     * Binary sensors will not be created unless they are also injected using `@InjectPushEntity`
     */
    binary_sensor?: Record<string, BinarySensorConfig>;
    /**
     * Buttons will be created on load.
     *
     * Annotate methods with `@TemplateButton` to receive activation events
     */
    button?: Record<string, ButtonConfig>;
    /**
     * Binary sensors will not be created unless they are also injected.
     *
     * Use `@InjectPushEntity` + `
     */
    sensor?: Record<string, SensorConfig>;
    /**
     * Switches are created on load.
     *
     * Use standard api commands to manage state
     */
    switch?: Record<string, SwitchConfig>;
  };
}
