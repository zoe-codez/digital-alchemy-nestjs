import { Injectable } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { AutoLogService, GetLogContext } from "@steggy/boilerplate";
import {
  EntityManagerService,
  iCallService,
  InjectProxy,
  OnEntityUpdate,
  PICK_ENTITY,
} from "@steggy/home-assistant";
import { eachSeries, is } from "@steggy/utilities";
import { CronJob } from "cron";
import EventEmitter from "eventemitter3";

import { ENFORCE_ENTITY_STATE, EnforceEntityStateConfig } from "../decorators";

@Injectable()
export class StateEnforcerService {
  constructor(
    @InjectProxy()
    private readonly call: iCallService,
    private readonly discovery: DiscoveryService,
    private readonly logger: AutoLogService,
    private readonly manager: EntityManagerService,
    private readonly event: EventEmitter,
  ) {}

  protected onModuleInit(): void {
    const providers = [
      ...this.discovery.getControllers(),
      ...this.discovery.getProviders(),
    ].filter(({ instance }) => !!instance);
    providers.forEach(wrapper => {
      const { instance } = wrapper;
      const proto = instance.constructor;
      if (!proto || !proto[ENFORCE_ENTITY_STATE]) {
        return;
      }
      const list = proto[ENFORCE_ENTITY_STATE] as EnforceEntityStateConfig[];
      list.forEach(data => {
        const { interval, entity_id } = data.options;
        let { on_entity_update = [], on_event = [] } = data.options;
        const entityList = is.string(entity_id) ? [entity_id] : entity_id;
        this.logger.error(
          { entity_id, interval },
          `${GetLogContext(instance)}#${
            data.property
          } state enforcer schedule {${interval}}`,
        );
        const run = async () =>
          await this.updateEntities(instance, data, entityList);
        const job = new CronJob(interval, run);
        job.start();
        if (!is.empty(on_event) && is.string(on_event)) {
          on_event = [on_event];
        }
        const onEvent = on_event as string[];
        if (is.string(on_entity_update)) {
          on_entity_update = [on_entity_update];
        }
        onEvent.push(
          ...on_entity_update.map(i => OnEntityUpdate.updateEvent(i)),
        );
        if (!is.empty(onEvent)) {
          onEvent.forEach(event => this.event.on(event, run));
        }
      });
    });
  }

  private async updateEntities(
    instance: unknown,
    data: EnforceEntityStateConfig,
    entityList: PICK_ENTITY<"switch">[],
  ): Promise<void> {
    const currentState = instance[data.property];
    const action = currentState ? "turn_on" : "turn_off";
    await eachSeries(entityList, async (entity_id: PICK_ENTITY<"switch">) => {
      const actual = this.manager.byId(entity_id)?.state?.toLocaleLowerCase();
      if (!action.includes(actual)) {
        this.logger.debug(`[${entity_id}] {${action}}`);
        await this.call.switch[action]({ entity_id });
      }
    });
  }
}
