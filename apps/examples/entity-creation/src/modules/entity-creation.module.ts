import { ApplicationModule } from "@steggy/boilerplate";

import { ExampleService } from "../services";

@ApplicationModule({
  application: "entity-creation",
  providers: [ExampleService],
})
export class EntityCreationModule {}
