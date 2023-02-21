import { ParameterDecoratorFactory } from "@steggy/utilities";
import { v4 } from "uuid";

import { PushSensorService } from "../services";
import { PICK_GENERATED_ENTITY } from "../types";

export const InjectPushSensor = ParameterDecoratorFactory<
  PICK_GENERATED_ENTITY<"sensors">
>(entity => ({
  inject: [PushSensorService],
  provide: v4(),
  useFactory: (push: PushSensorService) => push.createProxy(entity),
}));
