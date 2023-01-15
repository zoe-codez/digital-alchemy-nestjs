import { Inject, Provider } from "@nestjs/common";
import { v4 } from "uuid";

import { PICK_ENTITY } from "../contracts";
import { HassCallTypeGenerator } from "../services";

// import { HassMqttModuleOptions, MODULE_CONFIGURATION } from "../contracts";
// import { MQTTBinarySensor } from "../services";

export const INJECTED_ENTITIES = new Set<Provider>();

export function InjectBinarySensor(object_id: PICK_ENTITY): ParameterDecorator {
  return function (target, key, index) {
    const id = v4();
    INJECTED_ENTITIES.add({
      inject: [HassCallTypeGenerator],
      provide: id,
      useFactory(call: HassCallTypeGenerator) {
        return call.buildEntityProxy(object_id);
      },
    });
    return Inject(id)(target, key, index);
  };
}
