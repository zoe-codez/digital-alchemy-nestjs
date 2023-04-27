import { LibraryModule } from "@digital-alchemy/boilerplate";
import { DynamicModule } from "@nestjs/common";

import { BASE_URL, CHANNEL_MAPPING, LIB_GOTIFY, TOKEN } from "../config";
import { DYNAMIC_PROVIDERS } from "../decorators";
import {
  GotifyApplicationService,
  GotifyClientService,
  GotifyFetch,
  GotifyMessageService,
  GotifyNotify,
} from "../services";

@LibraryModule({
  configuration: {
    [BASE_URL]: {
      description: "Base URL for server",
      required: true,
      type: "string",
    },
    [CHANNEL_MAPPING]: {
      default: {},
      description: "Mapping of application names to tokens. Keep your keys out of the code!",
      type: "record",
    },
    [TOKEN]: {
      description: "Application token",
      required: true,
      type: "string",
    },
  },
  exports: [GotifyClientService, GotifyApplicationService, GotifyMessageService],
  library: LIB_GOTIFY,
  providers: [
    GotifyClientService,
    GotifyApplicationService,
    GotifyFetch,
    GotifyMessageService,
    GotifyNotify,
  ],
})
export class GotifyModule {
  public static forRoot(): DynamicModule {
    // @SendFrom()
    const config = [...DYNAMIC_PROVIDERS.values()];
    return {
      exports: [...config, GotifyClientService, GotifyApplicationService, GotifyMessageService],
      global: true,
      module: GotifyModule,
      providers: [
        ...config,
        GotifyClientService,
        GotifyApplicationService,
        GotifyFetch,
        GotifyNotify,
        GotifyMessageService,
      ],
    };
  }
}
