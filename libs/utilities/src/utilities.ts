/* eslint-disable @typescript-eslint/no-magic-numbers */
export const EVEN = 2;
export const PAIR = 2;
export const HALF = 0.5;
export const TWO_THIRDS = 2 / 3;
/**
 * Good for a surprising number of situations
 */
export const DEFAULT_LIMIT = 5;
export const INVERT_VALUE = -1;
// Sort
export const UP = 1;
// [LABEL,VALUE]
export const VALUE = 1;
// Standard value
export const ARRAY_OFFSET = 1;
// array[number +- increment]
export const INCREMENT = 1;
// Generic one-ness
export const SINGLE = 1;
// Sorting
export const SAME = 0;
// [LABEL,VALUE]
export const LABEL = 0;
// Generic start of something
export const START = 0;
export const NONE = 0;
export const FIRST = 0;
export const EMPTY = 0;
export const NO_CHANGE = 0;

// Testing of indexes
export const NOT_FOUND = -1;
// Sorting
export const DOWN = -1;
export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
export const SECOND = 1000;
export const PERCENT = 100;

type SleepReturn = Promise<void> & {
  /**
   * not passing true will result in the sleep never finishing (acting similar to an early return)
   */
  stop: (execute?: boolean) => void;
};
/**
 * Defaults to 1000 (1 second).
 *
 * ## Simple usage
 *
 * ```typescript
 * await sleep(5000);
 * ```
 *
 * ## Early stop
 *
 * ```typescript
 * const start = Date.now();
 * const timer = sleep(5000);
 * setTimeout(() => timer.stop(true),1000);
 * await timer;
 * const end = Date.now();
 * console.log(end - start); // 1000, because we stopped it early and executed
 * ```
 */
export function sleep(ms: number = SECOND): SleepReturn {
  let done: () => void;
  const out = new Promise<void>(i => (done = i)) as SleepReturn;
  const timeout = setTimeout(() => done(), ms);
  out.stop = (execute = false) => {
    if (execute) {
      done();
    }
    clearTimeout(timeout);
    done = undefined;
  };
  return out;
}

/**
 * ## (re)peat
 *
 * Create an array of length, where the values are filled with a provided fill value, or (index + 1) as default value
 */
export function PEAT<T extends unknown = number>(
  length: number,
  fill?: T,
): T[] {
  return Array.from({ length }).map(
    (item, index) => fill ?? ((index + ARRAY_OFFSET) as T),
  );
}
