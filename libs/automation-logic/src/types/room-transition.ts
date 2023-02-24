import { PICK_ENTITY } from "@steggy/home-assistant";
import { ConfigType } from "dayjs";

import { ALL_ROOM_NAMES, ROOM_SCENES } from "./utility";

export interface GradualDimOptions {
  end: ConfigType;
  entity_id: PICK_ENTITY<"light">;
  kelvin?: number;
  stop: () => void;
  target: number;
}

export interface LightTransition {
  duration: number;
  entity?: PICK_ENTITY<"light">;
  type: "light:gradual";
}

export type CannedTransitions = LightTransition;

export type TransitionFromType<ROOM_NAME extends ALL_ROOM_NAMES> =
  | ROOM_SCENES<ROOM_NAME>
  | "*";

/**
 * Any scene that is not the same as the from, unless it is "*"
 *
 * Transition from off => off isn't a transition, and won't have an associated event.
 * ... => "*" is NOT a work around
 */
export type TransitionToType<
  ROOM_NAME extends ALL_ROOM_NAMES,
  FROM extends TransitionFromType<ROOM_NAME>,
> = FROM extends "*"
  ? TransitionFromType<ROOM_NAME>
  : Exclude<TransitionFromType<ROOM_NAME>, FROM>;

type PR<A extends string, B> = Partial<Record<A, B>>;

export type SceneTransitionMapping<
  ROOM_NAME extends ALL_ROOM_NAMES,
  FROM extends TransitionFromType<ROOM_NAME> = TransitionFromType<ROOM_NAME>,
  TO extends TransitionToType<ROOM_NAME, FROM> = TransitionToType<
    ROOM_NAME,
    FROM
  >,
> = PR<FROM, PR<TO, CannedTransitions[]>>;

export type MethodTransition<
  ROOM_NAME extends ALL_ROOM_NAMES,
  FROM extends TransitionFromType<ROOM_NAME> = TransitionFromType<ROOM_NAME>,
  TO extends TransitionToType<ROOM_NAME, FROM> = TransitionToType<
    ROOM_NAME,
    FROM
  >,
> = {
  /**
   * Run if scene matches.
   * "*" = default value & match all
   */
  from?: FROM;
  method: string;
  /**
   * Run if scene matches.
   * "*" = default value & match all
   */
  to?: TO;
};
