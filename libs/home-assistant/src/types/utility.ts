import { is, START } from "@steggy/utilities";
import type { Get } from "type-fest";

import { ENTITY_SETUP, iCallService, MODULE_SETUP } from "../dynamic";

type generated = typeof MODULE_SETUP.generate_entities;

/**
 * Pick any entity that home assistant wants to create, optionally limiting by type
 */
export type PICK_GENERATED_ENTITY<
  DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS = ALL_GENERATED_SERVICE_DOMAINS,
> = {
  [key in DOMAIN]: `${key}.${keyof generated[key] & string}`;
}[DOMAIN];

/**
 * Pick any valid entity, optionally limiting by domain
 */
export type PICK_ENTITY<DOMAIN extends ALL_DOMAINS = ALL_DOMAINS> = {
  [key in DOMAIN]: `${key}.${keyof (typeof ENTITY_SETUP)[key] & string}`;
}[DOMAIN];

/**
 * Pick any valid entity, optionally limiting by domain
 */
export type PICK_SERVICE<
  DOMAIN extends ALL_SERVICE_DOMAINS = ALL_SERVICE_DOMAINS,
> = {
  [key in DOMAIN]: `${key}.${keyof iCallService[key] & string}`;
}[DOMAIN];

export type PICK_SERVICE_PARAMETERS<SERVICE extends PICK_SERVICE> = Parameters<
  Get<iCallService, SERVICE>
>[typeof START];

export function entity_split(
  entity: { entity_id: PICK_ENTITY } | PICK_ENTITY,
): [string, string] {
  if (is.object(entity)) {
    entity = entity.entity_id;
  }
  return entity.split(".") as [ALL_DOMAINS, string];
}

/**
 * Extract the domain from an entity with type safety
 */
export function domain(
  entity: { entity_id: PICK_ENTITY } | PICK_ENTITY,
): ALL_DOMAINS {
  if (is.object(entity)) {
    entity = entity.entity_id;
  }
  return entity_split(entity).shift();
}

/**
 * Type definitions to match a specific entity.
 *
 * Use with `@InjectEntity("some.entity")` to create proxy objects that always match the current state.
 */
export type ENTITY_STATE<ENTITY_ID extends PICK_ENTITY> = Get<
  typeof ENTITY_SETUP,
  ENTITY_ID
>;

/**
 * Union of all domains that contain entities
 */
export type ALL_DOMAINS = keyof typeof ENTITY_SETUP;

/**
 * Union of all services with callable methods
 */
export type ALL_SERVICE_DOMAINS = keyof iCallService;

export type ALL_GENERATED_SERVICE_DOMAINS = keyof generated;
