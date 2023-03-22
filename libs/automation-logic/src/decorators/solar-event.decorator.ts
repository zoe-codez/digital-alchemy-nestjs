import { MethodDecoratorFactory } from "@digital-alchemy/utilities";

import { SolarEvents } from "../services";

export type SolarOptions = `${SolarEvents}` | "*";

export const SolarEvent = MethodDecoratorFactory<SolarOptions>("SOLAR_EVENT");
