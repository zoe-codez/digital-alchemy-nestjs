import { SensorDeviceClasses } from "./sensor-device-class";
import { ALL_GENERATED_SERVICE_DOMAINS } from "./utility";

interface Base {
  availability?: Template;
  icon?: Icon;
  name?: string;
  unique_id?: string;
}

export type Timer = Record<string, number>;

type Action = unknown;
type Template = string;
export type Icon = string;

export type SensorTemplate = Base &
  SensorDeviceClasses & {
    attributes?: Record<string, Template>;
    picture?: Template;
    state: Template;
    state_class?: "measurement" | "total" | "total_increasing";
  };

export type BinarySensorTemplate = Base &
  Pick<SensorDeviceClasses, "device_class"> & {
    attributes?: Record<string, Template>;
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

export type SelectTemplate = Base & {
  optimistic?: boolean;
  options: Template;
  select_action: Action;
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
  | SwitchTemplateYaml
  | ButtonTemplateYaml
  | SelectTemplate
  | NumberTemplate;
//

export const GET_STATE_TEMPLATE = `{{ trigger.event.data.state }}`;
export const GET_ATTRIBUTE_TEMPLATE = (attribute: string) =>
  `{{ trigger.event.data.attributes.${attribute} }}`;
export type StorageData<CONFIG extends object = object> = {
  attributes: Record<string, unknown>;
  config: CONFIG;
  state: unknown;
};

export const UPDATE_TRIGGER = (
  domain: ALL_GENERATED_SERVICE_DOMAINS,
  sensor_id: string,
) => {
  if (sensor_id.includes(".")) {
    sensor_id = domain + "." + sensor_id;
  }
  return [
    {
      event: UPDATE_TRIGGER.event(domain),
      event_data: { sensor_id },
      platform: "event",
    },
  ];
};

UPDATE_TRIGGER.event = (domain: ALL_GENERATED_SERVICE_DOMAINS) =>
  `steggy_${domain}_update`;

export const TALK_BACK_ACTION = (
  domain: ALL_GENERATED_SERVICE_DOMAINS,
  sensor_id: string,
  action: string,
) => {
  if (sensor_id.includes(".")) {
    sensor_id = domain + "." + sensor_id;
  }
  return [
    {
      event: TALK_BACK_ACTION.event(domain, action),
      event_data: {
        action,
        sensor_id,
      },
    },
  ];
};

TALK_BACK_ACTION.event = (
  domain: ALL_GENERATED_SERVICE_DOMAINS,
  action: string,
) => `steggy_${domain}_talk_back_${action}`;
