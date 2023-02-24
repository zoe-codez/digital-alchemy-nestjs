import { MethodDecoratorFactory } from "@steggy/utilities";

import { SolarEvents } from "../services";

export const SolarEvent =
  MethodDecoratorFactory<`${SolarEvents}`>("SOLAR_EVENT");
