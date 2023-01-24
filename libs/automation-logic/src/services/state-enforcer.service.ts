import { Injectable } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { AutoLogService, GetLogContext } from "@steggy/boilerplate";
import {
  EntityManagerService,
  HassSocketAPIService,
  iCallService,
  InjectProxy,
  OnEntityUpdate,
  PICK_ENTITY,
} from "@steggy/home-assistant";
import { is } from "@steggy/utilities";
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
    private readonly socket: HassSocketAPIService,
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
      /**
       * Find all providers with properties that have been annotated with `@EnforceEntityState`
       */
      const list = proto[ENFORCE_ENTITY_STATE] as EnforceEntityStateConfig[];
      this.logger.info(
        `[${GetLogContext(instance)}] building state enforcer schedule for {${
          list.length
        }} properties`,
      );

      // Iterate over list (each item represents a single annotation)
      list.forEach(data => {
        const { interval, entity_id } = data.options;
        const {
          onEntityUpdate: on_entity_update = [],
          onEvent: on_event = [],
        } = data.options;
        const entityList = is.string(entity_id) ? [entity_id] : entity_id;

        // * Always run as cron schedule
        const job = new CronJob(
          interval,
          async () => await this.updateEntities(instance, data, entityList),
        );
        job.start();

        // Convert to array
        const onEvent = is.string(on_event) ? [on_event] : [...on_event];
        const entityToEventList = is.string(on_entity_update)
          ? [on_entity_update]
          : [...on_entity_update];

        // Convert entity list to list of event emitter update events, then merge onto event
        onEvent.push(
          ...entityToEventList.map(i => OnEntityUpdate.updateEvent(i)),
        );

        this.logger.debug(
          { entity_id, event_list: onEvent },
          `${GetLogContext(instance)}#${
            data.property
          } state enforcer schedule {${interval}}`,
        );

        // * Attach event emitter events
        onEvent.forEach(event =>
          this.event.on(
            event,
            async () => await this.updateEntities(instance, data, entityList),
          ),
        );
      });
    });
  }

  /**
   * Logic runner for the state enforcer
   */
  private async updateEntities(
    instance: unknown,
    data: EnforceEntityStateConfig,
    entity_id: PICK_ENTITY<"switch">[],
  ): Promise<void> {
    // ! Bail out if no action can be taken
    if (!this.socket.CONNECTION_ACTIVE) {
      this.logger.warn(
        `${GetLogContext(instance)}#${
          data.property
        } Skipping state enforce attempt, socket not available`,
      );
      return;
    }
    // Annotation can be used on property getter, or directly on a plain property (that some other logic updates)
    const currentState = instance[data.property];
    const action = currentState ? "turn_on" : "turn_off";

    const shouldExecute = entity_id.some(
      id => !action.includes(this.manager.byId(id)?.state?.toLocaleLowerCase()),
    );
    if (!shouldExecute) {
      return;
    }
    // * Notify and execute!
    this.logger.debug(`${entity_id.map(i => `[${i}]`).join(", ")} {${action}}`);
    await this.call.switch[action]({ entity_id });
  }
}
