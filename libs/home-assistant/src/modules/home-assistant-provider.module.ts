import { LibraryModule, RegisterCache } from "@steggy/boilerplate";

import { BASE_URL, LIB_HOME_ASSISTANT, TOKEN } from "../config";
import { HassFetchAPIService } from "../services";

/**
 * Partial Home Assistant module.
 * Intended for applications that just report data to entities
 */
@LibraryModule({
  configuration: {
    [BASE_URL]: {
      default: "http://localhost:8123",
      description: "Url to reach Home Assistant at",
      type: "string",
    },
    [TOKEN]: {
      description: "Long lived access token to Home Assistant.",
      type: "string",
    },
  },
  exports: [HassFetchAPIService],
  imports: [RegisterCache()],
  library: LIB_HOME_ASSISTANT,
  // Interrupt not meant to be used in this context (won't be provided as export)
  // Needs to be present as internal dependency
  providers: [HassFetchAPIService],
})
export class HomeAssistantProviderModule {}
