import { ParameterDecoratorFactory } from "@steggy/utilities";
import { v4 } from "uuid";

import { PushSwitchService } from "../services";
import { PICK_GENERATED_ENTITY } from "../types";

export const InjectPushSwitch = ParameterDecoratorFactory<
  PICK_GENERATED_ENTITY<"switch">
>(entity => ({
  inject: [PushSwitchService],
  provide: v4(),
  useFactory: (push: PushSwitchService) => push.createProxy(entity),
}));
