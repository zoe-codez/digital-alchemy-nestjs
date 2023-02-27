import {
  Bootstrap,
  CACHE_PROVIDER,
  LIB_BOILERPLATE,
} from "@steggy/boilerplate";

import { SceneManagerModule } from "../modules/scene-manager.module";

Bootstrap(SceneManagerModule, {
  config: {
    libs: {
      [LIB_BOILERPLATE]: { [CACHE_PROVIDER]: "redis" },
    },
  },
  http: true,
  prettyLog: true,
});
