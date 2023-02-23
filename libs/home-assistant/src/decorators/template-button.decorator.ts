import { MethodDecoratorFactory } from "@steggy/utilities";

import { PICK_GENERATED_ENTITY } from "../types";

export const TemplateButton =
  MethodDecoratorFactory<PICK_GENERATED_ENTITY<"button">>("TEMPLATE_BUTTON");

export const TemplateButtonCommandId = (app: string, entity: string) =>
  `${app.replaceAll("-", "_")}_${entity.replaceAll(".", "_")}`;
