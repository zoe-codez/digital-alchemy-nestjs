import {
  ACTIVE_APPLICATION,
  FetchService,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import {
  ADMIN_KEY,
  ADMIN_KEY_HEADER,
  LIB_SERVER,
} from "@digital-alchemy/server";
import { FetchWith, is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";

import { TALK_BACK_BASE_URL } from "../../config";
import { TemplateButtonCommandId } from "../../decorators";
import {
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  PICK_GENERATED_ENTITY,
} from "../../types";
import { PushButtonService, PushStorageMap, PushSwitchService } from "../push";

/**
 * Note: generated url segments must be matched against `talk-back.controller`
 */
@Injectable()
export class TalkBackService {
  constructor(
    @InjectConfig(ADMIN_KEY, LIB_SERVER)
    private readonly adminKey: string,
    @InjectConfig(TALK_BACK_BASE_URL)
    private readonly baseUrl: string,
    @Inject(ACTIVE_APPLICATION)
    private readonly application: string,
    @Inject(forwardRef(() => PushButtonService))
    private readonly pushButton: PushButtonService,
    @Inject(forwardRef(() => PushSwitchService))
    private readonly pushSwitch: PushSwitchService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    private readonly fetchService: FetchService,
  ) {
    this.authHeaders = is.empty(this.adminKey)
      ? {}
      : { [ADMIN_KEY_HEADER]: this.adminKey };
  }

  private readonly authHeaders: Record<string, string>;

  public createButtonRest(buttons: PICK_GENERATED_ENTITY<"button">[]) {
    return Object.fromEntries(
      buttons.map(key => {
        const [, idPart] = key.split(".");
        const buttonCustomTarget =
          this.configuration.generate_entities.button[idPart]?.target;

        const id = TemplateButtonCommandId(this.application, key);
        const baseGeneratedUrl = `${this.baseUrl}/talk-back/button-press/${key}`;
        if (!is.object(buttonCustomTarget)) {
          // * Basic "send to annotation" path
          const baseData = {
            headers: this.authHeaders,
            method: "get",
            url: baseGeneratedUrl,
          };
          return [id, baseData];
        }
        // * Extended data
        const url = is.empty(buttonCustomTarget.url)
          ? baseGeneratedUrl
          : this.fetchService.fetchCreateUrl({
              baseUrl: this.baseUrl,
              ...buttonCustomTarget,
            } as FetchWith);
        const method = buttonCustomTarget.method ?? "get";
        const data: Record<string, unknown> = { method, url };
        const isLocalRequest =
          !buttonCustomTarget.rawUrl && is.empty(buttonCustomTarget.baseUrl);
        if (!is.undefined(buttonCustomTarget.body)) {
          data.body = buttonCustomTarget.body;
        }

        // ? use provided headers if available
        if (!is.empty(buttonCustomTarget.headers)) {
          data.headers = buttonCustomTarget.headers;
          // ? if the target is not explicitly set, then assume local and use auth headers
        } else if (isLocalRequest) {
          data.headers = this.authHeaders;
        }
        return [id, data];
      }),
    );
  }

  public createSwitchRest(storage: PushStorageMap<"switch">) {
    return Object.fromEntries(
      [...storage.keys()].flatMap(key => [
        [
          TemplateButtonCommandId(this.application, key) + "_off",
          {
            headers: this.authHeaders,
            method: "get",
            url: `${this.baseUrl}/talk-back/switch-action/${key}/turn_off`,
          },
        ],
        [
          TemplateButtonCommandId(this.application, key) + "_on",
          {
            headers: this.authHeaders,
            method: "get",
            url: `${this.baseUrl}/talk-back/switch-action/${key}/turn_on`,
          },
        ],
      ]),
    );
  }

  public onButtonTalkBack(entity_id: PICK_GENERATED_ENTITY<"button">) {
    this.pushButton.announce(entity_id);
  }

  public onSwitchTalkBack(
    entity_id: PICK_GENERATED_ENTITY<"switch">,
    action: "turn_on" | "turn_off",
  ) {
    this.pushSwitch.onTalkBack(entity_id, action);
  }
}
