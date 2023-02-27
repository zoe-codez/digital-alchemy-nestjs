import { AutomationLogicModule } from "@steggy/automation-logic";
import { ApplicationModule } from "@steggy/boilerplate";
import { HomeAssistantModule } from "@steggy/home-assistant";
import { MQTTModule } from "@steggy/mqtt";
import { ServerModule } from "@steggy/server";

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
            high: { friendly_name: "On" },
            off: { friendly_name: "Off" },
          },
        },
      },
    }),
    HomeAssistantModule.forRoot({
      controllers: true,
      generate_entities: {
        binary_sensor: {
          entity_creation_binary_sensor: {
            name: "Example binary sensor",
          },
        },
        button: {
          entity_creation_button: {
            name: "Example button",
          },
        },
        sensor: {
          entity_creation_sensor: {
            name: "Example sensor",
            track_history: true,
          },
        },
        switch: {
          entity_creation_switch: {
            name: "Example switch",
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
export class SceneManagerModule {}
