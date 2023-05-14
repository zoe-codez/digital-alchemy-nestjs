import { HTTP_METHODS } from "@digital-alchemy/utilities";
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

type PassthroughTarget = {
  /**
   * POSTDATA to send with requests
   */
  body?: object;
  /**
   * ~ default: process auth headers if `rawUrl` !== `true`
   * ~ default: empty object if `rawUrl` === `true`
   */
  headers?: object;
  /**
   * default: `get`
   */
  method?: `${HTTP_METHODS}`;
  /**
   * Extra query params to add
   */
  params?: Record<string, string>;
  /**
   * default: false
   */
  rawUrl?: boolean;
  /**
   * Can be provided as local url `/controller/route`
   */
  url: string;
};

export type ButtonConfig = BaseConfig & {
  target?: PassthroughTarget;
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
   * Binary sensors will not be created unless they are also injected.
   *
   * Use `@InjectPushEntity` + `
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
  @IsBoolean()
  public controllers?: boolean;
  @IsOptional()
  @ValidateNested()
  public generate_entities?: GenerateEntities;
}
