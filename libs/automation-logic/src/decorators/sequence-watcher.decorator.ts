import { MethodDecoratorFactory } from "@steggy/boilerplate";

import { SequenceWatchDTO } from "../contracts";

export const SequenceWatcher =
  MethodDecoratorFactory<SequenceWatchDTO>("SEQUENCE_WATCH");
