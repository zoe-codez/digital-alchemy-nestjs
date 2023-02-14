import { DiscoveryModule } from "@nestjs/core";
import { LibraryModule, RegisterCache } from "@steggy/boilerplate";

import { QuickActionService } from "../services";

@LibraryModule({
  configuration: {},
  exports: [QuickActionService],
  imports: [DiscoveryModule, RegisterCache()],
  library: "automation-helper",
  providers: [QuickActionService],
})
export class AutomationHelperModule {}
