import { is } from "@steggy/utilities";
import type { Get } from "type-fest";

import { ENTITY_SETUP } from "../dynamic";

/**
 * Pick any valid entity, optionally limiting by domain
 */
export declare type PICK_ENTITY<
  DOMAIN extends keyof typeof ENTITY_SETUP = keyof typeof ENTITY_SETUP,
> = {
  [key in DOMAIN]: `${key}.${keyof typeof ENTITY_SETUP[key] & string}`;
}[DOMAIN];

export function split(
  entity: { entity_id: PICK_ENTITY } | PICK_ENTITY,
): [string, string] {
  if (is.object(entity)) {
    entity = entity.entity_id;
  }
  return entity.split(".") as [string, string];
}

export function domain(
  entity: { entity_id: PICK_ENTITY } | PICK_ENTITY,
): keyof typeof ENTITY_SETUP {
  if (is.object(entity)) {
    entity = entity.entity_id;
  }
  return split(entity).shift();
}

export type ENTITY_STATE<T extends string> = Get<typeof ENTITY_SETUP, T>;
export type ALL_DOMAINS = keyof typeof ENTITY_SETUP;
