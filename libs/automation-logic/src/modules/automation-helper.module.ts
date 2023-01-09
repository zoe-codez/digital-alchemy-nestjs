import { DiscoveryModule } from "@nestjs/core";
import { LibraryModule, RegisterCache } from "@steggy/boilerplate";

import { EntityToolsService, QuickActionService } from "../services";

@LibraryModule({
  configuration: {},
  exports: [QuickActionService],
  imports: [DiscoveryModule, RegisterCache()],
  library: Symbol("automation-logic"),
  providers: [EntityToolsService, QuickActionService],
})
export class AutomationHelperModule {}
