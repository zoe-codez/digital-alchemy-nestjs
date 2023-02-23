import {
  Bootstrap,
  CACHE_PROVIDER,
  LIB_BOILERPLATE,
} from "@steggy/boilerplate";

import { EntityCreationModule } from "../modules/entity-creation.module";

Bootstrap(EntityCreationModule, {
  config: {
    libs: {
      [LIB_BOILERPLATE]: { [CACHE_PROVIDER]: "redis" },
    },
  },
  http: true,
  prettyLog: true,
});