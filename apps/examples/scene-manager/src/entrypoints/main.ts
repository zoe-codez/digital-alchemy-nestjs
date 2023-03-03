import {
  Bootstrap,
  CACHE_PROVIDER,
  LIB_BOILERPLATE,
} from "@steggy/boilerplate";

import { SceneManagerModule } from "../modules/scene-manager.module";

Bootstrap(SceneManagerModule, {
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
