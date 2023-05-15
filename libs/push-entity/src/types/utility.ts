import { PICK_ENTITY } from "@digital-alchemy/home-assistant";
import { is } from "@digital-alchemy/utilities";

import { MODULE_SETUP } from "../dynamic";
import {
  BinarySensorConfig,
  ButtonConfig,
  SensorConfig,
  SwitchConfig,
} from "./module";

type generated = typeof MODULE_SETUP.generate_entities;

/**
 * Pick any entity that home assistant wants to create, optionally limiting by type
 */
export type PICK_GENERATED_ENTITY<
  DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS = ALL_GENERATED_SERVICE_DOMAINS,
> = {
  [key in DOMAIN]: `${key}.${keyof generated[key] & string}`;
}[DOMAIN];

export function generated_entity_split(entity: PICK_GENERATED_ENTITY) {
  return entity.split(".") as [ALL_GENERATED_SERVICE_DOMAINS, string];
}

/**
 * Extract the domain from an entity with type safety
 */
export function generated_domain(
  entity: { entity_id: PICK_GENERATED_ENTITY } | PICK_GENERATED_ENTITY,
): ALL_GENERATED_SERVICE_DOMAINS {
  if (is.object(entity)) {
    entity = entity.entity_id;
  }
  const [domain] = generated_entity_split(entity);
  return domain;
}

type SwitchProxy = {
  state: boolean;
};
type SensorProxy = {
  attributes: Record<string, unknown>;
  state: number | string;
};
type BinarySensorProxy = {
  attributes: Record<string, unknown>;
  state: boolean;
};

export enum PushProxyDomains {
  switch = "switch",
  sensor = "sensor",
  binary_sensor = "binary_sensor",
}

export type PUSH_PROXY_DOMAINS = `${PushProxyDomains}`;
export function IsPushDomain(domain: string): domain is PushProxyDomains {
  return is.undefined(PushProxyDomains[domain]);
}

export type PUSH_PROXY<
  ENTITY extends PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>,
> = {
  binary_sensor: BinarySensorProxy;
  sensor: SensorProxy;
  switch: SwitchProxy;
}[GetDomain<ENTITY>];

export type ALL_GENERATED_SERVICE_DOMAINS = keyof generated;

export const isDomain = <
  DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS = ALL_GENERATED_SERVICE_DOMAINS,
>(
  entity: PICK_GENERATED_ENTITY,
  domain: DOMAIN,
): entity is PICK_GENERATED_ENTITY<DOMAIN> =>
  generated_domain(entity) === domain;

export const isGeneratedDomain = <
  DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS = ALL_GENERATED_SERVICE_DOMAINS,
>(
  entity: PICK_GENERATED_ENTITY,
  domain: DOMAIN,
): entity is PICK_GENERATED_ENTITY<DOMAIN> =>
  generated_domain(entity) === domain;

type PushSensorDomains = "sensor" | "binary_sensor";

type GetGeneratedStateType<DOMAIN extends PushSensorDomains> = {
  binary_sensor: boolean;
  sensor: unknown;
}[DOMAIN];

export type iPushSensor<
  ENTITY extends PICK_GENERATED_ENTITY<PushSensorDomains>,
> = {
  state: GetGeneratedStateType<GetDomain<ENTITY>>;
};

export type GetDomain<ENTITY extends PICK_ENTITY | PICK_GENERATED_ENTITY> =
  ENTITY extends `${infer domain}.${string}` ? domain : never;

export type ConfigDomainMap = {
  binary_sensor: BinarySensorConfig;
  button: ButtonConfig;
  sensor: SensorConfig;
  switch: SwitchConfig;
};

export type GET_CONFIG<DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> =
  ConfigDomainMap[DOMAIN];
