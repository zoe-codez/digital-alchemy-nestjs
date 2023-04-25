import { EMPTY, HOUR, MINUTE, SECOND, START } from "@digital-alchemy/utilities";

const NUMLEN = 2;
const NUMLEN_MILLI = 4;

export function HMS(ms: number) {
  const hour = Math.floor(ms / HOUR);
  const minute = Math.floor((ms - hour * HOUR) / MINUTE);
  const second = Math.floor((ms - hour * HOUR - minute * MINUTE) / SECOND);
  return format({ hour, minute, second });
}

export function HMSS(ms: number) {
  const hour = Math.floor(ms / HOUR);
  const minute = Math.floor((ms - hour * HOUR) / MINUTE);
  const second = Math.floor((ms - hour * HOUR - minute * MINUTE) / SECOND);
  const milli = Math.floor(
    (ms - hour * HOUR - minute * MINUTE - second * SECOND) / SECOND,
  );
  return format({ hour, milli, minute, second });
}

function format({
  hour,
  milli,
  minute,
  second,
}: {
  hour?: number;
  milli?: number;
  minute?: number;
  second?: number;
}) {
  const list = [];
  if (hour) {
    list.push(hour);
  }
  if (minute || hour) {
    list.push(minute ?? EMPTY);
  }
  if (second || minute || hour) {
    list.push(second || EMPTY);
  }
  const prefix = list.map(i => i.toString().padStart(NUMLEN, "0")).join(`:`);
  if (milli) {
    return `${prefix}.${milli.toString().slice(START, NUMLEN_MILLI)}`;
  }
  return prefix;
}
