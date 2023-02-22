import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import {
  InjectPushEntity,
  PUSH_PROXY,
  PushProxyService,
} from "@steggy/home-assistant";
import { inspect } from "util";

@Injectable()
export class ExampleService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly registry: PushProxyService,
    @InjectPushEntity("sensor.entity_creation_sensor")
    private readonly pushSensor: PUSH_PROXY<"sensor.entity_creation_sensor">,
  ) {}

  protected onPostInit() {
    const list = this.registry.applicationYaml();
    console.log(inspect(list, false, 5, true));
    //
  }
}
