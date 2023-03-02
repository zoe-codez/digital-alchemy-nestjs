import { MethodDecoratorFactory } from "@steggy/utilities";

export type SequenceWatchDTO<
  DATA extends object = object,
  MATCH extends string = string,
> = {
  /**
   * Pre-filter to only events of a given type
   */
  event_type: string;

  /**
   * Pick objects of relevance out of the event stream
   */
  filter: (data: DATA) => boolean;

  /**
   * States from controller to match
   */
  match: MATCH[];

  /**
   * "path.to.property"
   */
  path: string;

  /**
   * Normally a watcher must wait 1500 as a "cooling off" / "waiting for more states to match with to come in"
   *
   * - `self`: after activating, reset the progress of this particular activate event so it can re-activate immediately
   *
   * - `tag:${string}`: reset ALL kunami watchers that share the same tag
   */
  reset?: "none" | "self" | `tag:${string}`;
};

/**
 * Watch device triggers for a specific sequence, then run the annotated method
 */
export const SequenceWatcher =
  MethodDecoratorFactory<SequenceWatchDTO>("SEQUENCE_WATCH");
