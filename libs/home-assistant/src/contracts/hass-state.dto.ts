import { PICK_ENTITY } from "./utility";

export enum HassEvents {
  state_changed = "state_changed",
  hue_event = "hue_event",
}

export class ContextDTO {
  public id: string;
  public parent_id: string;
  public user_id: string;
}

export class GenericEntityDTO<
  // Deliberately disabling type checks against this
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  STATE extends any = any,
  ATTRIBUTES extends Record<never, unknown> = { friendly_name?: string },
> {
  public attributes: ATTRIBUTES;
  public context: ContextDTO;
  public entity_id: PICK_ENTITY | string;
  public last_changed: string;
  public last_updated: string;
  public state: STATE;
}

export declare class EventDataDTO<
  ID extends PICK_ENTITY = PICK_ENTITY,
  STATE extends Record<never, unknown> = unknown,
  ATTRIBUTES extends Record<never, unknown> = Record<never, unknown>,
> {
  entity_id?: ID;
  event?: number;
  id?: string;
  new_state?: GenericEntityDTO<STATE, ATTRIBUTES>;
  old_state?: GenericEntityDTO<STATE, ATTRIBUTES>;
}
export declare class HassEventDTO<
  ID extends PICK_ENTITY = PICK_ENTITY,
  STATE extends Record<never, unknown> = unknown,
  ATTRIBUTES extends Record<never, unknown> = Record<never, unknown>,
> {
  context: ContextDTO;
  data: EventDataDTO<ID, STATE, ATTRIBUTES>;
  event_type: HassEvents;
  origin: "local";
  result?: string;
  time_fired: Date;
  variables: Record<string, unknown>;
}
