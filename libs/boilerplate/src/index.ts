// For package.json
import "rxjs";

import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import isBetween from "dayjs/plugin/isBetween";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";

export * from "./config";
export * from "./decorators";
export * from "./includes";
export * from "./modules";
export * from "./services";
export * from "./types";

// ? both required for `dayjs().format("ww")`
// prints week number as part of the format string
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
