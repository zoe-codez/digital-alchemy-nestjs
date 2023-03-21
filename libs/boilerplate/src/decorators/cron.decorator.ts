import {
  CronExpression,
  MethodDecoratorFactory,
} from "@digital-alchemy/utilities";

export enum CronObject {
  second,
  minute,
  hour,
  dayOfMonth,
  month,
  dayOfWeek,
}

type CronString = string | CronExpression | Date;
export type CronOptions = CronString | CronString[];
export const Cron = MethodDecoratorFactory<CronOptions>("CRON_SCHEDULE");
