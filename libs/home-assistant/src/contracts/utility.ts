import { is } from "@steggy/utilities";
import type { Get } from "type-fest";

import { ENTITY_SETUP } from "../dynamic";

/**
 * Pick any valid entity, optionally limiting by domain
 */
export type PICK_ENTITY<DOMAIN extends ALL_DOMAINS = ALL_DOMAINS> = {
  [key in DOMAIN]: `${key}.${keyof typeof ENTITY_SETUP[key] & string}`;
}[DOMAIN];

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
