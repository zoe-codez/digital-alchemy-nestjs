import { Bootstrap } from "@steggy/boilerplate";

import { EntityCreationModule } from "../modules/entity-creation.module";

Bootstrap(EntityCreationModule, {
  http: true,
  prettyLog: true,
});
