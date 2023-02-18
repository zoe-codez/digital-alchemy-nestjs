import { PICK_SERVICE, PICK_SERVICE_PARAMETERS } from "./utility";

type HomeAssistantScriptSequence<SERVICE extends PICK_SERVICE = PICK_SERVICE> =
  {
    data: PICK_SERVICE_PARAMETERS<SERVICE>;
    service: SERVICE;
  };

export type HomeAssistantScript = {
  alias: string;
  icon: string;
  mode: "single";
  sequence: HomeAssistantScriptSequence[];
};
