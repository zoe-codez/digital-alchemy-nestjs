import {
  LIB_BOILERPLATE,
  LOG_LEVEL,
  QuickScript,
} from "@digital-alchemy/boilerplate";
import { PiMatrixClientModule } from "@digital-alchemy/pi-matrix-client";
import { ServerModule } from "@digital-alchemy/server";

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
  imports: [PiMatrixClientModule.forRoot({ controllers: true }), ServerModule],
})
export class PiMatrix {}
