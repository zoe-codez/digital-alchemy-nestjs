import { SetMetadata } from "@nestjs/common";

import { SequenceWatchDTO } from "../contracts";

export const SEQUENCE_WATCH = "SEQUENCE_WATCH";

export function SequenceWatcher<T extends string = string>(
  ...options: SequenceWatchDTO<T>[]
): MethodDecorator {
  return SetMetadata(SEQUENCE_WATCH, options);
}
