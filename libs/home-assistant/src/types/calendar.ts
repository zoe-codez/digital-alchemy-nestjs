import { PICK_ENTITY } from "./utility";

export type CalendarFetchOptions = {
  calendar: PICK_ENTITY<"calendar">;
  end: Date;
  start: Date;
};

export type CalendarEvent = {
  description?: string;
  end: { dateTime: string };
  location?: string;
  recurrence_id?: string;
  rrule?: string;
  start: { dateTime: string };
  summary: string;
  uid?: string;
};
