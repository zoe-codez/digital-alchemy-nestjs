import { MethodDecoratorFactory } from "@steggy/utilities";

import { PICK_ENTITY } from "../types";

export type OnEntityUpdateOptions = PICK_ENTITY[] | PICK_ENTITY;
export const OnEntityUpdate =
  MethodDecoratorFactory<OnEntityUpdateOptions>("ON_ENTITY_UPDATE");
