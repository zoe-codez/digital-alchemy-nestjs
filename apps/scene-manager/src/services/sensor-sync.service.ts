/* eslint-disable sonarjs/no-duplicate-string */
import {
  LOCATION_UPDATED,
  SolarCalcService,
  SolarEvent,
  SolarEvents,
} from "@digital-alchemy/automation-logic";
import { AutoLogService, Cron, OnEvent } from "@digital-alchemy/boilerplate";
import {
  InjectPushEntity,
  PUSH_PROXY,
  SOCKET_READY,
} from "@digital-alchemy/home-assistant";
import {
  CronExpression,
  DOWN,
  is,
  TitleCase,
  UP,
} from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import dayjs from "dayjs";

@Injectable()
export class SensorSyncService {
  constructor(
    private readonly calc: SolarCalcService,
    private readonly logger: AutoLogService,
    private readonly solar: SolarCalcService,
    @InjectPushEntity("sensor.next_solar_event")
    private readonly nextEvent: PUSH_PROXY<"sensor.next_solar_event">,
    @InjectPushEntity("sensor.next_solar_event_time")
    private readonly nextEventTime: PUSH_PROXY<"sensor.next_solar_event_time">,
    @InjectPushEntity("binary_sensor.is_past_solar_noon")
    private readonly isPastNoon: PUSH_PROXY<"binary_sensor.is_past_solar_noon">,
    /**
     * 11AM - 6PM
     */
    @InjectPushEntity("binary_sensor.is_afternoon")
    private readonly isAfternoon: PUSH_PROXY<"binary_sensor.is_afternoon">,
    /**
     * dawn - dusk
     */
    @InjectPushEntity("binary_sensor.is_day")
    private readonly isDay: PUSH_PROXY<"binary_sensor.is_day">,
    /**
     * dawn - 7:30
     */
    @InjectPushEntity("binary_sensor.is_early")
    private readonly isEarly: PUSH_PROXY<"binary_sensor.is_early">,
    /**
     * 6PM - SLEEP (after 10PM)
     */
    @InjectPushEntity("binary_sensor.is_evening")
    private readonly isEvening: PUSH_PROXY<"binary_sensor.is_evening">,
    /**
     * 9:45PM - dawn
     */
    @InjectPushEntity("binary_sensor.is_late")
    private readonly isLate: PUSH_PROXY<"binary_sensor.is_late">,
    /**
     * (WAKEUP/8:30) - 11AM
     */
    @InjectPushEntity("binary_sensor.is_morning")
    private readonly isMorning: PUSH_PROXY<"binary_sensor.is_morning">,
    /**
     * Approx stock market hours, no accounting for holidays
     *
     * - 8:30AM - 3PM
     */
    @InjectPushEntity("binary_sensor.is_work")
    private readonly isWork: PUSH_PROXY<"binary_sensor.is_work">,
    /**
     * Go to bed!
     *
     * - 11PM - 7AM
     */
    @InjectPushEntity("binary_sensor.should_sleep")
    private readonly shouldSleep: PUSH_PROXY<"binary_sensor.should_sleep">,
  ) {}

  protected onApplicationBootstrap(): void {
    this.onSolarEvent();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @OnEvent({ events: [SOCKET_READY, LOCATION_UPDATED] })
  protected async onDayPhaseUpdate(): Promise<void> {
    const calc = await this.calc.getCalc();
    const [now, AM11, PM6, EOD, PM945, AM830, PM3, AM7, PM11] = is.shortTime([
      "NOW",
      "AM11",
      "PM6",
      "TOMORROW",
      "PM9:45",
      "AM8:30",
      "PM3",
      "AM7",
      "PM11",
    ]);

    this.isAfternoon.state = now.isAfter(AM11) && now.isBefore(PM6);
    this.isDay.state = now.isAfter(calc.dawn) && now.isBefore(calc.dusk);
    this.isEarly.state = now.isAfter(calc.dawn) && now.isBefore(AM7);
    this.isEvening.state = now.isBefore(EOD) && now.isAfter(dayjs(PM6));
    this.isLate.state = now.isBefore(calc.dawn) || now.isAfter(PM945);
    this.isMorning.state = now.isAfter(AM830) && now.isBefore(AM11);
    this.isWork.state = now.isAfter(AM830) && now.isBefore(PM3);
    this.shouldSleep.state = now.isAfter(PM11) || now.isBefore(AM7);
  }

  @OnEvent({ events: [SOCKET_READY] })
  @SolarEvent("*")
  protected onSolarEvent(): void {
    const calc = this.solar.getCalcSync();
    const now = dayjs();
    this.isPastNoon.state = now.isAfter(calc.solarNoon);
    const entry =
      (["dawn", "dusk", "solarNoon", "sunrise", "sunset"] as SolarEvents[])
        .sort((a, b) => (dayjs(calc[a]).isAfter(calc[b]) ? UP : DOWN))
        .find(i => now.isBefore(calc[i])) ?? "";
    if (!entry) {
      this.logger.debug("blank out");
      this.nextEvent.state = "";
      this.nextEventTime.state = "";
      return;
    }
    this.nextEvent.state = TitleCase(entry);
    this.nextEventTime.state = dayjs(calc[entry]).format("hh:mm");
  }
}
