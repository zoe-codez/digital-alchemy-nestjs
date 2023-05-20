/* eslint-disable sonarjs/no-duplicate-string */
import {
  DeterministicSwitch,
  refTimes,
  SCENE_CHANGE,
  SceneRoom,
  SolarCalcService,
  SolarEvent,
} from "@digital-alchemy/automation-logic";
import {
  AutoLogService,
  Cron,
  CronExpression,
  OnEvent,
} from "@digital-alchemy/boilerplate";
import {
  ENTITY_STATE,
  iCallService,
  InjectCallProxy,
  InjectEntityProxy,
  TemplateButton,
} from "@digital-alchemy/home-assistant";
import dayjs from "dayjs";

@SceneRoom({
  name: "office",
  scenes: {
    auto: {
      // "light.monitor_bloom": { brightness: 255, state: "on" },
      // "light.office_fan": { brightness: 150, state: "on" },
      "switch.office_plants": { state: "on" },
    },
    evening: {
      // "light.monitor_bloom": { brightness: 75, state: "on" },
      // "light.office_fan": { brightness: 40, state: "on" },
      "switch.office_plants": { state: "off" },
    },
    high: {
      // "light.monitor_bloom": { brightness: 255, state: "on" },
      // "light.office_fan": { brightness: 255, state: "on" },
      "switch.office_plants": { state: "on" },
    },
    intermediate_dim: {
      // "light.monitor_bloom": { brightness: 150, state: "on" },
      // "light.office_fan": { brightness: 100, state: "on" },
      "switch.office_plants": { state: "on" },
    },
    off: {
      // "light.monitor_bloom": { state: "off" },
      // "light.office_fan": { state: "off" },
      "switch.office_plants": { state: "off" },
    },
  },
})
export class Office {
  constructor(
    private readonly logger: AutoLogService,
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly solar: SolarCalcService,
    @InjectEntityProxy("binary_sensor.should_sleep")
    private readonly shouldSleep: ENTITY_STATE<"binary_sensor.should_sleep">,
    @InjectEntityProxy("switch.windows_open")
    private readonly windowOpen: ENTITY_STATE<"switch.windows_open">,
    @InjectEntityProxy("binary_sensor.is_rainy_weather")
    private readonly rainyWeather: ENTITY_STATE<"binary_sensor.is_rainy_weather">,
    @InjectEntityProxy("switch.office_plants")
    private readonly officePlants: ENTITY_STATE<"switch.office_plants">,
    @InjectEntityProxy("sensor.office_current_scene")
    private readonly sceneEntity: ENTITY_STATE<"sensor.office_current_scene">,
  ) {}

  private get currentScene() {
    return (this.sceneEntity.attributes as { scene: string }).scene;
  }

  @DeterministicSwitch({
    entity_id: "switch.office_plants",
    onEvent: [SolarEvent("sunset")],
  })
  protected get plantsShouldBeOn() {
    if (!this.solar.between("sunrise", "sunset")) {
      return false;
    }
    const [PM3] = refTimes(["15"]);
    if (dayjs().isBefore(PM3)) {
      return true;
    }
    if (this.currentScene === "off") {
      return false;
    }
    if (this.rainyWeather.state === "on") {
      return false;
    }
    return this.officePlants.state === "on";
  }

  @DeterministicSwitch({
    entity_id: "switch.wax_warmer",
    onEntityUpdate: ["switch.windows_open"],
    onEvent: [OnEvent(SCENE_CHANGE("office"))],
  })
  protected get waxWarmerShouldBeOn() {
    if (this.windowOpen.state === "on") {
      return false;
    }
    if (this.currentScene === "off") {
      return false;
    }
    return true;
  }

  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  protected async eveningHandOff(force = false): Promise<void> {
    if (!(force || ["auto", "dim"].includes(this.currentScene))) {
      return;
    }
    await this.call.scene.turn_on({ entity_id: "scene.office_evening" });
  }

  @TemplateButton("button.office_focus")
  protected async focus(): Promise<void> {
    if (this.shouldSleep.state === "on") {
      this.logger.info("Evening hand off redirect");
      await this.eveningHandOff(true);
      return;
    }
    this.logger.info("Office focus");
    await Promise.all([
      this.call.scene.turn_on({ entity_id: "scene.office_focus" }),
    ]);
  }
}
