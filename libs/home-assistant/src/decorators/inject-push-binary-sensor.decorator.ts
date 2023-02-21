import { ParameterDecoratorFactory } from "@steggy/utilities";
import { v4 } from "uuid";

import { PushBinarySensorService } from "../services";
import { PICK_GENERATED_ENTITY } from "../types";

export const InjectPushBinarySensor = ParameterDecoratorFactory<
  PICK_GENERATED_ENTITY<"binary_sensor">
>(entity => ({
  inject: [PushBinarySensorService],
  provide: v4(),
  useFactory: (push: PushBinarySensorService) => push.createProxy(entity),
}));
