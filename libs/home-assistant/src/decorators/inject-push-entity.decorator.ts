import { ParameterDecoratorFactory } from "@steggy/utilities";
import { v4 } from "uuid";

import { PushProxyService } from "../services";
import { PICK_GENERATED_ENTITY } from "../types";

export const InjectPushEntity =
  ParameterDecoratorFactory<PICK_GENERATED_ENTITY>(entity => ({
    inject: [PushProxyService],
    provide: v4(),
    useFactory: (manager: PushProxyService) => manager.createPushProxy(entity),
  }));
