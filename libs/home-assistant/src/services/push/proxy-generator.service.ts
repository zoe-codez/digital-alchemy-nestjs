import { AutoLogService } from "@digital-alchemy/boilerplate";
import { Injectable } from "@nestjs/common";

import {
  isGeneratedDomain,
  PICK_GENERATED_ENTITY,
  PUSH_PROXY,
  PUSH_PROXY_DOMAINS,
} from "../../types";
import { PushBinarySensorService } from "./push-binary-sensor.service";
import { PushSensorService } from "./push-sensor.service";

type ProxyEntity = PICK_GENERATED_ENTITY<PUSH_PROXY_DOMAINS>;

@Injectable()
export class ProxyGeneratorService {
  constructor(
    private readonly pushSensor: PushSensorService,
    private readonly logger: AutoLogService,
    private readonly pushBinarySensor: PushBinarySensorService,
  ) {}

  public async createPushProxy<ENTITY extends ProxyEntity = ProxyEntity>(
    entity: ENTITY,
  ): Promise<PUSH_PROXY<ENTITY>> {
    if (isGeneratedDomain(entity, "sensor")) {
      return (await this.pushSensor.createProxy(entity)) as PUSH_PROXY<ENTITY>;
    }
    if (isGeneratedDomain(entity, "binary_sensor")) {
      return (await this.pushBinarySensor.createProxy(
        entity,
      )) as PUSH_PROXY<ENTITY>;
    }
    this.logger.error(
      { context: `@InjectPushEntity(${entity})` },
      `No proxy support for this domain`,
    );
    return undefined;
  }
}
