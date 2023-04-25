import { Bootstrap } from "@digital-alchemy/boilerplate";

import { PiMatrixModule } from "../modules";

Bootstrap(PiMatrixModule, {
  http: {
    enabled: true,
  },
  logging: {
    prettyLog: true,
  },
});
