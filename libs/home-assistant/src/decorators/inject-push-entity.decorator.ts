import { ParameterDecoratorFactory } from "@steggy/utilities";
import { v4 } from "uuid";

import { EntityManagerService } from "../services";
import { PICK_GENERATED_ENTITY } from "../types";

export const InjectPushEntity =
  ParameterDecoratorFactory<PICK_GENERATED_ENTITY>(entity => ({
    inject: [EntityManagerService],
    provide: v4(),
    useFactory: (manager: EntityManagerService) =>
      manager.createPushProxy(entity),
  }));
