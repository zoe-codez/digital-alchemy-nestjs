import { BinarySensorConfig } from "./module";
import { SensorDeviceClasses } from "./sensor-device-class";

interface Base {
  availability?: Template;
  icon?: Icon;
  name?: string;
  unique_id?: string;
}

export type SensorTemplate = Base &
  SensorDeviceClasses & {
    attributes?: Record<string, Template>;
    picture?: Template;
    state: Template;
    state_class?: "measurement" | "total" | "total_increasing";
  };

export type Timer = Record<string, number>;

export type BinarySensorTemplate = Base &
  Pick<SensorDeviceClasses, "device_class"> & {
    attributes?: Record<string, Template>;
    auto_off?: Timer;
    delay_off?: Timer;
    delay_on?: Timer;
    picture?: Template;
    state: Template;
  };

type Action = unknown;
type Template = string;
export type Icon = string;

export type NumberTemplate = Base & {
  max?: Template;
  min?: Template;
  optimistic?: boolean;
  set_value: Action;
  state: Template;
  step: Template;
};

export type SelectTemplate = Base & {
  optimistic?: boolean;
  options: Template;
  select_action: Action;
  state: Template;
};

export type ButtonTemplate = Base & {
  press: Action;
};

export type SwitchTemplate = Base;

export type TemplateEntity =
  | ButtonTemplate
  | SelectTemplate
  | NumberTemplate
  | BinarySensorConfig
  | SwitchTemplate
  | SensorTemplate;

export type SensorTemplateYaml = {
  sensor: SwitchTemplate[];
  trigger: unknown[];
};

export type BinarySensorTemplateYaml = {
  sensor: BinarySensorTemplate[];
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
  | SwitchTemplateYaml;
