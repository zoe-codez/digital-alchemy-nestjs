export const CRON_SCHEDULE_TRIGGERED = "CRON_SCHEDULE_TRIGGERED";
export type CronScheduleTriggeredData = {
  context: string;
  schedule: string;
  time: number;
};
