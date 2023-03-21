import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { ACTIVE_APPLICATION, InjectConfig } from "@digital-alchemy/boilerplate";
import { ADMIN_KEY, ADMIN_KEY_HEADER, LIB_SERVER } from "@digital-alchemy/server";
import { is } from "@digital-alchemy/utilities";

import { TALK_BACK_BASE_URL } from "../../config";
import { TemplateButtonCommandId } from "../../decorators";
import { PICK_GENERATED_ENTITY } from "../../types";
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
  ) {
    this.headers = is.empty(this.adminKey)
      ? {}
      : { [ADMIN_KEY_HEADER]: this.adminKey };
  }

  private readonly headers: Record<string, string>;

  public createButtonRest(buttons: PICK_GENERATED_ENTITY<"button">[]) {
    return Object.fromEntries(
      buttons.map(key => [
        TemplateButtonCommandId(this.application, key),
        {
          headers: this.headers,
          method: "get",
          url: `${this.baseUrl}/talk-back/button-press/${key}`,
        },
      ]),
    );
  }

  public createSwitchRest(storage: PushStorageMap<"switch">) {
    return Object.fromEntries(
      [...storage.keys()].flatMap(key => [
        [
          TemplateButtonCommandId(this.application, key) + "_off",
          {
            headers: this.headers,
            method: "get",
            url: `${this.baseUrl}/talk-back/switch-action/${key}/turn_off`,
          },
        ],
        [
          TemplateButtonCommandId(this.application, key) + "_on",
          {
            headers: this.headers,
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
