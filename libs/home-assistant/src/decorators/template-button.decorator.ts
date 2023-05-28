import { MethodDecoratorFactory } from "@digital-alchemy/utilities";

import { PICK_GENERATED_ENTITY } from "../types";

export const TemplateButton =
  MethodDecoratorFactory<PICK_GENERATED_ENTITY<"button">>("TEMPLATE_BUTTON");
