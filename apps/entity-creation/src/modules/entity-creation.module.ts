import { ApplicationModule } from "@digital-alchemy/boilerplate";
import { HomeAssistantModule } from "@digital-alchemy/home-assistant";
import { ServerModule } from "@digital-alchemy/server";

import { ExampleService } from "../services";

@ApplicationModule({
  application: "entity-creation",
  imports: [
    ServerModule,
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
  ],
  providers: [ExampleService],
})
export class EntityCreationModule {}
