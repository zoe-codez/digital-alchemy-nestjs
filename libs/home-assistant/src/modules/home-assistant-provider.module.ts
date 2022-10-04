import { LibraryModule, RegisterCache } from "@steggy/boilerplate";

import { BASE_URL, LIB_HOME_ASSISTANT, TOKEN } from "../config";
import { HomeAssistantFetchAPIService } from "../services";

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
      // Not absolutely required, if the app does not intend to open a connection
      description: "Long lived access token to Home Assistant.",
      type: "string",
    },
  },
  exports: [HomeAssistantFetchAPIService],
  imports: [RegisterCache()],
  library: LIB_HOME_ASSISTANT,
  providers: [HomeAssistantFetchAPIService],
})
export class HomeAssistantProviderModule {}
