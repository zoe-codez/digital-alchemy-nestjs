import { MethodDecoratorFactory } from "@steggy/utilities";

import { SequenceWatchDTO } from "../contracts";

export const SequenceWatcher =
  MethodDecoratorFactory<SequenceWatchDTO>("SEQUENCE_WATCH");
