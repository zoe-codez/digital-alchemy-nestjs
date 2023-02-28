import { START } from "@steggy/utilities";
import dayjs, { Dayjs } from "dayjs";

/**
 * Quickly calculate reference points in time.
 * Times are in reference to 12AM/midnight this morning, and input in 24 hour format.
 * Values are input from left to right
 *
 * > HH[:mm[:ss]]
 *
 *
 * ## Usage Example
 *
 * ```typescript
 * const [AM830, PM3, TOMORROW] = refTimes(["8:30", "15", "24"]);
 * const now = dayjs();
 * if (!now.isBetween(AM830, PM3)) {
 *   console.log(
 *     `${Math.abs(now.diff(TOMORROW, "minute"))} minutes until tomorrow`,
 *   );
 * }
 * ```
 */
export function refTimes(times: TimeString[]): Dayjs[] {
  const today = dayjs().format("YYYY-MM-DD");
  return times.map(i => dayjs(`${today} ${i}`).millisecond(START));
}

type Digit = `${number}`;

type TimeString = Digit | `${Digit}:${Digit}` | `${Digit}:${Digit}:${Digit}`;
