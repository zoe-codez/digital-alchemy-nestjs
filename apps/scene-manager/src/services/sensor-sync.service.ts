/* eslint-disable sonarjs/no-duplicate-string */
import {
  LOCATION_UPDATED,
  SolarCalcService,
  SolarEvent,
  SolarEvents,
} from "@digital-alchemy/automation-logic";
import { AutoLogService, Cron, OnEvent } from "@digital-alchemy/boilerplate";
import {
  PushEntityService,
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
    // @InjectPushEntity("sensor.next_solar_event")
    // private readonly nextEvent: PUSH_PROXY<"sensor.next_solar_event">,
    // @InjectPushEntity("sensor.next_solar_event_time")
    // private readonly nextEventTime: PUSH_PROXY<"sensor.next_solar_event_time">,
    // @InjectPushEntity("binary_sensor.is_past_solar_noon")
    // private readonly isPastNoon: PUSH_PROXY<"binary_sensor.is_past_solar_noon">,
    // /**
    //  * 11AM - 6PM
    //  */
    // @InjectPushEntity("binary_sensor.is_afternoon")
    // private readonly isAfternoon: PUSH_PROXY<"binary_sensor.is_afternoon">,
    // /**
    //  * dawn - dusk
    //  */
    // @InjectPushEntity("binary_sensor.is_day")
    // private readonly isDay: PUSH_PROXY<"binary_sensor.is_day">,
    // /**
    //  * dawn - 7:30
    //  */
    // @InjectPushEntity("binary_sensor.is_early")
    // private readonly isEarly: PUSH_PROXY<"binary_sensor.is_early">,
    // /**
    //  * 6PM - SLEEP (after 10PM)
    //  */
    // @InjectPushEntity("binary_sensor.is_evening")
    // private readonly isEvening: PUSH_PROXY<"binary_sensor.is_evening">,
    // /**
    //  * 9:45PM - dawn
    //  */
    // @InjectPushEntity("binary_sensor.is_late")
    // private readonly isLate: PUSH_PROXY<"binary_sensor.is_late">,
    // /**
    //  * (WAKEUP/8:30) - 11AM
    //  */
    // @InjectPushEntity("binary_sensor.is_morning")
    // private readonly isMorning: PUSH_PROXY<"binary_sensor.is_morning">,
    // /**
    //  * Approx stock market hours, no accounting for holidays
    //  *
    //  * - 8:30AM - 3PM
    //  */
    // @InjectPushEntity("binary_sensor.is_work")
    // private readonly isWork: PUSH_PROXY<"binary_sensor.is_work">,
    // /**
    //  * Go to bed!
    //  *
    //  * - 11PM - 7AM
    //  */
    // @InjectPushEntity("binary_sensor.should_sleep")
    // private readonly shouldSleep: PUSH_PROXY<"binary_sensor.should_sleep">,
    private readonly pushEntity: PushEntityService,
  ) {}

  protected onApplicationBootstrap(): void {
    this.onSolarEvent();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  @OnEvent({ events: [SOCKET_READY, LOCATION_UPDATED] })
  protected async onDayPhaseUpdate(): Promise<void> {
    const calc = await this.calc.getCalc();
    const [now, AM11, PM6, EOD, PM945] = is.shortTime([
      "NOW",
      "AM11",
      "PM6",
      "TOMORROW",
      "PM9:45",
    ]);

    this.pushEntity.proxySet(
      "binary_sensor.is_afternoon",
      "state",
      now.isAfter(AM11) && now.isBefore(PM6),
    );
    this.pushEntity.proxySet(
      "binary_sensor.is_day",
      "state",
      now.isAfter(calc.dawn) && now.isBefore(calc.dusk),
    );
    this.pushEntity.proxySet(
      "binary_sensor.is_early",
      "state",
      now.isAfter(calc.dawn) && now.isBefore(calc.dusk),
    );
    this.pushEntity.proxySet(
      "binary_sensor.is_late",
      "state",
      now.isBefore(calc.dawn) || now.isAfter(PM945),
    );
    this.pushEntity.proxySet(
      "binary_sensor.is_evening",
      "state",
      now.isBefore(EOD) && now.isAfter(dayjs(PM6)),
    );
  }

  @OnEvent({ events: [SOCKET_READY] })
  @SolarEvent("*")
  protected onSolarEvent(): void {
    const calc = this.solar.getCalcSync();
    const now = dayjs();
    this.pushEntity.proxySet(
      "binary_sensor.is_past_solar_noon",
      "state",
      now.isAfter(calc.solarNoon),
    );
    const entry =
      (["dawn", "dusk", "solarNoon", "sunrise", "sunset"] as SolarEvents[])
        .sort((a, b) => (dayjs(calc[a]).isAfter(calc[b]) ? UP : DOWN))
        .find(i => now.isBefore(calc[i])) ?? "";
    if (!entry) {
      this.logger.debug("blank out");
      this.pushEntity.proxySet("sensor.next_solar_event", "state", "");
      this.pushEntity.proxySet("sensor.next_solar_event_time", "state", "");
      return;
    }
    this.pushEntity.proxySet(
      "sensor.next_solar_event",
      "state",
      TitleCase(entry),
    );
    this.pushEntity.proxySet(
      "sensor.next_solar_event_time",
      "state",
      dayjs(calc[entry]).format("hh:mm"),
    );
  }
}
