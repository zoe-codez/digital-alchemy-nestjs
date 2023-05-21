import { AutomationLogicModule } from "@digital-alchemy/automation-logic";
import { ApplicationModule } from "@digital-alchemy/boilerplate";
import {
  HassSocketAPIService,
  HomeAssistantModule,
  PushEntityConfigService,
} from "@digital-alchemy/home-assistant";
import { MQTTModule } from "@digital-alchemy/mqtt";
import { ServerModule } from "@digital-alchemy/server";

import { AppController } from "../controllers";
import { Bedroom, Loft, Office } from "../rooms";
import { SensorSyncService } from "../services";

@ApplicationModule({
  application: "scene-manager",
  controllers: [AppController],
  imports: [
    AutomationLogicModule.forRoot({
      global_scenes: { high: true, off: true },
      room_configuration: {
        bedroom: {
          name: "Bedroom",
          scenes: {
            dimmed: { friendly_name: "Dimmed" },
            high: { friendly_name: "On" },
            off: { friendly_name: "Off" },
          },
        },
        loft: {
          name: "Loft",
          scenes: {
            high: { friendly_name: "On" },
            off: { friendly_name: "Off" },
          },
        },
        office: {
          name: "Office",
          scenes: {
            auto: {
              description: "General purpose slightly dimmed light",
              friendly_name: "Auto",
            },
            evening: {
              description:
                "Campfire dim. Schedule controlled when attempting to use auto",
              friendly_name: "Evening",
            },
            high: {
              description: "Get bright",
              friendly_name: "On",
            },
            intermediate_dim: {
              description:
                "Intermediate step between auto and evening. Redirected to based on time",
              friendly_name: "Intermediate Dim",
            },
            off: {
              description: "Turn off all the lights",
              friendly_name: "Off",
            },
          },
        },
      },
    }),
    HomeAssistantModule.forRoot({
      controllers: true,
      generate_entities: {
        binary_sensor: {
          is_afternoon: { name: "Is afternoon" },
          is_day: { name: "Is day" },
          is_early: { name: "Is early" },
          is_evening: { name: "Is evening" },
          is_late: { name: "Is late" },
          is_morning: { name: "Is morning" },
          is_past_solar_noon: { name: "Is past solar noon" },
          is_work: { name: "Is work" },
          should_sleep: { name: "Should sleep" },
        },
        button: {
          custom_rest: {
            name: "Custom rest",
            target: {
              url: "/app/custom-rest",
            },
          },
          office_focus: {
            name: "Office focus",
          },
        },
        sensor: {
          next_solar_event: {
            name: "Next solar event",
          },
          next_solar_event_time: {
            name: "Next solar event time",
          },
        },
        switch: {
          office_plants: {
            icon: "mdi:light-flood-down",
            name: "Office plant lights",
            track_history: true,
          },
          windows_open: {
            icon: "mdi:window-open",
            name: "Window is open",
            track_history: true,
          },
        },
      },
    }),
    MQTTModule,
    ServerModule,
  ],
  providers: [Bedroom, Office, Loft, SensorSyncService],
})
export class SceneManagerModule {
  constructor(
    private readonly socket: HassSocketAPIService,
    private readonly config: PushEntityConfigService,
  ) {}

  protected async onApplicationBootstrap(): Promise<void> {
    await this.socket.init();
  }

  protected onPostInit() {
    setTimeout(async () => {
      await this.config.rebuild();
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    }, 5000);
  }
}
