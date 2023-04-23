import { Dayjs } from "dayjs";

import { PICK_ENTITY } from "./utility";

export type CalendarFetchOptions = {
  calendar: PICK_ENTITY<"calendar">;
  end: Date;
  start: Date;
};

export type RawCalendarEvent = {
  description?: string;
  end: { dateTime: string };
  location?: string;
  recurrence_id?: string;
  rrule?: string;
  start: { dateTime: string };
  summary: string;
  uid?: string;
};

export type CalendarEvent = Omit<RawCalendarEvent, "end" | "start"> & {
  end: Dayjs;
  start: Dayjs;
};
