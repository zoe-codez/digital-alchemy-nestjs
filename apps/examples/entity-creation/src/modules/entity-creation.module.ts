import { ApplicationModule } from "@steggy/boilerplate";
import { HomeAssistantModule } from "@steggy/home-assistant";
import { ServerModule } from "@steggy/server";

import { ExampleService } from "../services";

@ApplicationModule({
  application: "entity-creation",
  imports: [
    ServerModule,
    HomeAssistantModule.forRoot({
      generate_entities: {
        binary_sensor: {
          entity_creation_binary_sensor: {
            name: "Example binary sensor",
          },
        },
        button: {
          entity_creation_button: {
            name: "Example switch",
          },
        },
        sensor: {
          entity_creation_sensor: {
            name: "Example sensor",
          },
        },
        switch: {
          entity_creation_switch: {
            name: "Example switch",
          },
        },
      },
    }),
  ],
  providers: [ExampleService],
})
export class EntityCreationModule {}
