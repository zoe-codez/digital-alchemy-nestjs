import { PICK_ENTITY } from "@steggy/home-assistant";
import { ConfigType } from "dayjs";

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

export type SceneTransitionMapping<SCENES extends string> = Partial<
  // From
  Record<
    SCENES | "*",
    Partial<
      // To
      Record<
        SCENES | "*",
        // How
        CannedTransitions[]
      >
    >
  >
>;
