import { FetchWith } from "@digital-alchemy/utilities";
import { IsString } from "class-validator";

import { SensorDeviceClasses } from "./sensor-device-class";

interface Base {
  attributes?: Record<string, Template>;
  availability?: Template;
  icon?: Icon;
  name?: string;
  unique_id?: string;
}

/**
 * Seem to be compatible on accident
 */
export type HARestCall = FetchWith;

export type Timer = Record<string, number>;

export class InputSelectOnSelect {
  @IsString()
  public option: string;
}

type Action = unknown;
export type Template = string;
export type Icon = string;

export type SensorTemplate = Base &
  SensorDeviceClasses & {
    picture?: Template;
    state: Template;
    state_class?: "measurement" | "total" | "total_increasing";
  };

export type BinarySensorTemplate = Base &
  Pick<SensorDeviceClasses, "device_class"> & {
    auto_off?: Timer;
    delay_off?: Timer;
    delay_on?: Timer;
    picture?: Template;
    state: Template;
  };

export type NumberTemplate = Base & {
  max?: Template;
  min?: Template;
  optimistic?: boolean;
  set_value: Action;
  state: Template;
  step: Template;
};

/**
 * Currently limited to plain list of strings as options due to . See:
 *
 * ~ https://community.home-assistant.io/t/input-select-enhancement-support-mapping/94391/13
 * ~ https://community.home-assistant.io/t/select-helper-with-label-and-values/467301
 */
export type InputSelectTemplate = Base & {
  optimistic?: boolean;
  options: string[];
  select_action: Action;
  select_option: string;
  state: Template;
};

export type ButtonTemplate = Base & {
  press: Action;
};

export type SensorTemplateYaml = {
  sensor: SensorTemplate[];
  trigger: unknown[];
};

export type ButtonTemplateYaml = {
  button: ButtonTemplate[];
};
export type InputSelectTemplateYaml = {
  select: InputSelectTemplate[];
};

export type BinarySensorTemplateYaml = {
  binary_sensor: BinarySensorTemplate[];
  trigger: unknown[];
};

export type SwitchTemplateYaml = {
  availability_template?: Template;
  entity_picture_template?: Template;
  friendly_name?: string;
  icon_template?: Template;
  turn_off: Action;
  turn_on: Action;
  unique_id?: string;
  value_template?: Template;
};

export type TemplateYaml =
  | SensorTemplateYaml
  | BinarySensorTemplateYaml
  | SwitchTemplateYaml
  | ButtonTemplateYaml
  | InputSelectTemplateYaml
  | NumberTemplate;
//

export type StorageData<CONFIG extends object = object> = {
  attributes: Record<string, unknown>;
  config: CONFIG;
  state: unknown;
};
