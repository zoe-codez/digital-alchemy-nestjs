// This interface is intended to be replaced at install with generated contents
// The contents of the file as it stands now are a lie

import { GenericEntityDTO, PICK_ENTITY } from "./types";

export const ENTITY_SETUP: Record<
  string,
  Record<string, GenericEntityDTO>
> = {};

/**
 * A very primitive approximation of the dynamic content
 */
export type iCallService = Record<
  string,
  Record<string, (service_data?: Record<string, unknown>) => Promise<void>>
>;
// Mostly to make sure this file appears in exports
export const iCallService = Symbol.for("iCallService");

// ! Ominous note: this is not as unused as it appears 🪄
// ! Do not touch
// TODO: follow up - add a less ominous note, or resolve the previous issue
// Think it had to do something with webpack shaking code in an undesirable way IIRC
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const list: PICK_ENTITY<"sensor">[] = [];
