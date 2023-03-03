import {
  Bootstrap,
  CACHE_PROVIDER,
  LIB_BOILERPLATE,
} from "@steggy/boilerplate";

import { EntityCreationModule } from "../modules/entity-creation.module";

Bootstrap(EntityCreationModule, {
  application: {
    config: {
      libs: {
        [LIB_BOILERPLATE]: { [CACHE_PROVIDER]: "redis" },
      },
    },
  },
  http: {
    enabled: true,
  },
  logging: {
    prettyLog: true,
  },
});
