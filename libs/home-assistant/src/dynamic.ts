// This interface is intended to be replaced at install with generated contents
// The contents of the file as it stands now are a lie

import { GenericEntityDTO, PICK_ENTITY } from "./contracts";

export const ENTITY_SETUP: Record<
  string,
  Record<string, GenericEntityDTO>
> = {};

// eslint-disable-next-line @typescript-eslint/ban-types
export type iCallService = Record<
  keyof typeof ENTITY_SETUP,
  Record<string, (service_data?: Record<string, unknown>) => Promise<void>>
>;
// Mostly to make sure this file appears in exports
export const iCallService = Symbol.for("iCallService");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const list: PICK_ENTITY<"sensor">[] = [];
