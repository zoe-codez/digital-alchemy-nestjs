import { Injectable } from "@nestjs/common";
import { AutoLogService, ModuleScannerService } from "@steggy/boilerplate";
import {
  EntityManagerService,
  HassSocketAPIService,
  iCallService,
  InjectCallProxy,
  OnEntityUpdate,
  OnEntityUpdateOptions,
  PICK_ENTITY,
} from "@steggy/home-assistant";
import { CronExpression, is } from "@steggy/utilities";
import { CronJob } from "cron";
import EventEmitter from "eventemitter3";

import { DeterministicSwitch, DeterministicSwitchOptions } from "../decorators";

@Injectable()
export class StateEnforcerService {
  constructor(
    @InjectCallProxy()
    private readonly call: iCallService,
    private readonly scanner: ModuleScannerService,
    private readonly logger: AutoLogService,
    private readonly manager: EntityManagerService,
    private readonly event: EventEmitter,
    private readonly socket: HassSocketAPIService,
  ) {}

  protected onModuleInit(): void {
    const map =
      this.scanner.findAnnotatedProperties<DeterministicSwitchOptions>(
        DeterministicSwitch,
      );
    map.forEach((targets, instance) => {
      targets.forEach(({ key, data, context }) => {
        this.logger.info({ context }, `[@DeterministicSwitch] {%s}`, key);
        const { interval = CronExpression.EVERY_10_MINUTES, entity_id } = data;
        const {
          onEntityUpdate: on_entity_update = [],
          onEvent: on_event = [],
        } = data;
        const entityList = is.string(entity_id) ? [entity_id] : entity_id;

        const update = async () =>
          await this.updateEntities(
            Boolean(instance[key]),
            entityList,
            context,
          );

        // * Always run as cron schedule
        const job = new CronJob(interval, update);
        job.start();

        // * Convert to array
        const onEvent = [on_event].flat();
        // * Convert any passed entity watcher ids to an a watchable annotation
        if (!is.empty(on_entity_update)) {
          onEvent.push(OnEntityUpdate([on_entity_update].flat()));
        }
        // * Bind to all annotations
        onEvent.forEach(decorator => {
          decorator.pipe(async () => await update());
        });
      });
    });
  }

  /**
   * Logic runner for the state enforcer
   */
  private async updateEntities(
    current: boolean,
    entity_id: PICK_ENTITY<"switch">[],
    context: string,
  ): Promise<void> {
    // ! Bail out if no action can be taken
    if (!this.socket.CONNECTION_ACTIVE) {
      this.logger.warn(
        { context },
        `Skipping state enforce attempt, socket not available`,
      );
      return;
    }
    // Annotation can be used on property getter, or directly on a plain property (that some other logic updates)
    const action = current ? "turn_on" : "turn_off";

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
