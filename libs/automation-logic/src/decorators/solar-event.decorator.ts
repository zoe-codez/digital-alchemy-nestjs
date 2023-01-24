import { OnEvent } from "@steggy/boilerplate";

import { SolarEvents } from "../services";

export const SOLAR_EVENT = "SOLAR_EVENT";

export function SolarEvent(event: `${SolarEvents}`): MethodDecorator {
  return OnEvent(SolarEvent.eventName(event));
}
SolarEvent.eventName = (event: `${SolarEvents}`) => `solar/${event}`;
