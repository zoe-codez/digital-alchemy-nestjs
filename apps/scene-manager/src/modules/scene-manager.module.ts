import { AutomationLogicModule } from "@digital-alchemy/automation-logic";
import { ApplicationModule } from "@digital-alchemy/boilerplate";
import {
  HassSocketAPIService,
  HomeAssistantModule,
  PushEntityConfigService,
} from "@digital-alchemy/home-assistant";
import { MQTTModule } from "@digital-alchemy/mqtt";
import { ServerModule } from "@digital-alchemy/server";

import { Bedroom, Loft, Office } from "../rooms";

@ApplicationModule({
  application: "scene-manager",
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
        // button: {
        //   entity_creation_button: {
        //     name: "Example button",
        //   },
        // },
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
            name: "Office plant lights",
            track_history: true,
          },
          windows_open: {
            name: "Window is open",
            track_history: true,
          },
        },
      },
    }),
    MQTTModule,
    ServerModule,
  ],
  providers: [Bedroom, Office, Loft],
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
    }, 5000);
  }
}