import { FetchWith } from "@digital-alchemy/utilities";
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

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

export class BaseConfig {
  @IsString()
  @IsOptional()
  public availability?: Template;
  @IsString()
  @IsOptional()
  public icon?: Icon;
  @IsString()
  @IsOptional()
  public name?: string;
  @IsString()
  @IsOptional()
  public track_history?: boolean;
}

export const SwitchConfig = BaseConfig;
export const ButtonConfig = BaseConfig;
export type SwitchConfig = BaseConfig;
export type InputSelectConfig = BaseConfig & {
  options: string[];
};
export type ButtonConfig = BaseConfig & {
  /**
   * **Note:** Default operation causes button to bind to a `@TemplateButton` annotation.
   * Providing this value will break annotation functionality.
   *
   * Cause the button to send a http request to a custom target.
   * Urls will attempt to generate in a way that resolves to this application, using `ADMIN_KEY` based auth, unless overridden
   */
  target?: FetchWith;
};

export class GenerateEntities {
  /**
   * Binary sensors will not be created unless they are also injected using `@InjectPushEntity`
   */
  @ValidateNested()
  @IsOptional()
  public binary_sensor?: Record<string, BinarySensorConfig>;
  /**
   * Buttons will be created on load.
   *
   * Annotate methods with `@TemplateButton` to receive activation events
   */
  @ValidateNested()
  @IsOptional()
  public button?: Record<string, ButtonConfig>;
  /**
   * Select
   */
  @ValidateNested()
  @IsOptional()
  public input_select?: Record<string, InputSelectConfig>;
  /**
   * Binary sensors will not be created unless they are also injected.
   *
   * Use `@InjectPushEntity`
   */
  @ValidateNested()
  @IsOptional()
  public sensor?: Record<string, SensorConfig>;
  /**
   * Switches are created on load.
   *
   * Use standard api commands to manage state
   */
  @ValidateNested()
  @IsOptional()
  public switch?: Record<string, SwitchConfig>;
}

export class HomeAssistantModuleConfiguration {
  @IsOptional()
  @ValidateNested()
  public authHeaders?: Record<string, string>;
  @IsOptional()
  @IsBoolean()
  public controllers?: boolean;
  @IsOptional()
  @ValidateNested()
  public generate_entities?: GenerateEntities;
}
