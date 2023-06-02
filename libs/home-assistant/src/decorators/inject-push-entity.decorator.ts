import { ParameterDecoratorFactory } from "@digital-alchemy/utilities";
import { v4 } from "uuid";

import { ProxyGeneratorService, PushProxyService } from "../services";
import { PICK_GENERATED_ENTITY, PUSH_PROXY_DOMAINS } from "../types";

export const InjectPushEntity = ParameterDecoratorFactory<
  PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>
>(entity => ({
  inject: [PushProxyService],
  provide: v4(),
  useFactory: (manager: ProxyGeneratorService) =>
    manager.createPushProxy(entity),
}));
