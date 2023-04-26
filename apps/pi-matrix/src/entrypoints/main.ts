import {
  LIB_BOILERPLATE,
  LOG_LEVEL,
  QuickScript,
} from "@digital-alchemy/boilerplate";
import { PiMatrixClientModule } from "@digital-alchemy/pi-matrix-client";
import { ServerModule } from "@digital-alchemy/server";

import { AnimationController, MatrixController } from "../controllers";

@QuickScript({
  application: "pi-matrix",
  bootstrap: {
    application: {
      config: {
        libs: {
          [LIB_BOILERPLATE]: { [LOG_LEVEL]: "debug" },
        },
      },
    },
    http: { enabled: true },
  },
  controllers: [AnimationController, MatrixController],
  imports: [PiMatrixClientModule, ServerModule],
})
export class PiMatrix {}
