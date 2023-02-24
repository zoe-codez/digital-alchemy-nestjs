import { MethodDecoratorFactory } from "@steggy/utilities";

import { SequenceWatchDTO } from "../types";

export const SequenceWatcher =
  MethodDecoratorFactory<SequenceWatchDTO>("SEQUENCE_WATCH");
