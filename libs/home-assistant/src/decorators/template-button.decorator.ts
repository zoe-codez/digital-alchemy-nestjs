import { OnEvent } from "@steggy/boilerplate";

import { PICK_GENERATED_ENTITY } from "../types";

export function TemplateButton(
  button: PICK_GENERATED_ENTITY<"button">,
): MethodDecorator {
  return OnEvent(TemplateButton.activationEvent(button));
}
TemplateButton.activationEvent = (button: PICK_GENERATED_ENTITY<"button">) =>
  `${button}/update`;
