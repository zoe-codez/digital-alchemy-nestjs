import { MethodDecoratorFactory } from "@digital-alchemy/utilities";

import { HassEventDTO } from "../types";

export type OnHassEventOptions = {
  event_type: string;
  match?: (data: HassEventDTO) => boolean;
};

/**
 * Fires in response to more generic events coming in from home assistant, instead of just entity updates
 */
export const OnHassEvent =
  MethodDecoratorFactory<OnHassEventOptions>("ON_HASS_EVENT");
