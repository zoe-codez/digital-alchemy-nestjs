import { FetchService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  ADMIN_KEY,
  ADMIN_KEY_HEADER,
  LIB_SERVER,
} from "@digital-alchemy/server";
import { FetchWith, is } from "@digital-alchemy/utilities";
import { forwardRef, Inject, Injectable } from "@nestjs/common";

import { TALK_BACK_BASE_URL } from "../../config";
import {
  HARestCall,
  HOME_ASSISTANT_MODULE_CONFIGURATION,
  HomeAssistantModuleConfiguration,
  InputSelectOnSelect,
  PICK_GENERATED_ENTITY,
} from "../../types";
import {
  PushButtonService,
  PushEntityService,
  PushStorageMap,
  PushSwitchService,
} from "../push";
import { PushInputSelectService } from "../push/push-input-select.service";

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
    @Inject(forwardRef(() => PushButtonService))
    private readonly pushButton: PushButtonService,
    @Inject(forwardRef(() => PushSwitchService))
    private readonly pushSwitch: PushSwitchService,
    @Inject(HOME_ASSISTANT_MODULE_CONFIGURATION)
    private readonly configuration: HomeAssistantModuleConfiguration,
    @Inject(forwardRef(() => PushInputSelectService))
    private readonly pushSelect: PushInputSelectService,
    private readonly fetchService: FetchService,
    private readonly pushEntity: PushEntityService,
  ) {
    const injectedAuthHeaders = this.configuration.authHeaders;
    if (is.object(injectedAuthHeaders) && !is.empty(injectedAuthHeaders)) {
      this.authHeaders = injectedAuthHeaders;
    } else if (!is.empty(this.adminKey)) {
      this.authHeaders = { [ADMIN_KEY_HEADER]: this.adminKey };
    }
  }

  private readonly authHeaders: Record<string, string> = {};

  /**
   * - If a custom target is defined for the button, use that (merge with some default data)
   * - If no target is defined, send request through the default talk back controller
   */
  public createButtonRest(buttons: PICK_GENERATED_ENTITY<"button">[]) {
    return Object.fromEntries(
      buttons.map(key => {
        const [, idPart] = key.split(".");
        const buttonCustomTarget =
          this.configuration.generate_entities.button[idPart]?.target;

        const [, id] = this.pushEntity.commandId(key).split(".");
        const baseGeneratedUrl = `${this.baseUrl}/talk-back/button/${key}`;
        // ? No talk back target defined
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
            } as HARestCall);
        const method = buttonCustomTarget.method ?? "get";
        const data: HARestCall = { method, url };
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

  public createInputSelectRest(
    inputs: PICK_GENERATED_ENTITY<"input_select">[],
  ) {
    return Object.fromEntries(
      inputs.map(key => {
        const id = this.pushEntity.commandId(key);
        return [
          id,
          {
            body: { option: "{{ option }}" } as InputSelectOnSelect,
            headers: this.authHeaders,
            method: "post",
            url: `${this.baseUrl}/talk-back/input_select/${key}`,
          } as FetchWith,
        ];
      }),
    );
  }

  public createSwitchRest(storage: PushStorageMap<"switch">) {
    return Object.fromEntries(
      [...storage.keys()].flatMap(key =>
        ["off", "on"].map(i => [
          this.pushEntity.commandId(key, i),
          {
            headers: this.authHeaders,
            method: "get",
            url: `${this.baseUrl}/talk-back/switch/${key}/${i}`,
          },
        ]),
      ),
    );
  }

  public onButtonTalkBack(entity_id: PICK_GENERATED_ENTITY<"button">) {
    this.pushButton.onTalkBack(entity_id);
  }

  public onInputSelectTalkBack(
    entity_id: PICK_GENERATED_ENTITY<"input_select">,
    data: InputSelectOnSelect,
  ) {
    this.pushSelect.onTalkBack(entity_id, data);
  }

  public onSwitchTalkBack(
    entity_id: PICK_GENERATED_ENTITY<"switch">,
    action: "on" | "off",
  ) {
    this.pushSwitch.onTalkBack(entity_id, action);
  }

  public updateTriggerEvent(entity_id: PICK_GENERATED_ENTITY) {
    return [
      {
        platform: "webhook",
        webhook_id: this.updateTriggerEventName(entity_id),
      },
    ];
  }

  public updateTriggerEventName(entity_id: PICK_GENERATED_ENTITY) {
    return `digital_alchemy_${entity_id.replace(".", "_")}_update`;
  }
}
