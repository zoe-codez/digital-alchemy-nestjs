import { MethodDecoratorFactory } from "@steggy/utilities";

import { SequenceWatchDTO } from "../types";

/**
 * Watch device triggers for a specific sequence, then run the annotated method
 */
export const SequenceWatcher =
  MethodDecoratorFactory<SequenceWatchDTO>("SEQUENCE_WATCH");
