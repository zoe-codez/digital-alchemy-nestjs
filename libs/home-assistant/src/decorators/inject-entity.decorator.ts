import { Inject, InternalServerErrorException, Provider } from "@nestjs/common";
import { v4 } from "uuid";

import { ENTITY_STATE, PICK_ENTITY } from "../contracts";
import { EntityManagerService } from "../services";

export const INJECTED_ENTITIES = new Set<Provider>();

export function InjectEntity<ENTITY extends PICK_ENTITY>(
  entity: ENTITY,
): ParameterDecorator {
  return function (target, key, index) {
    const id = v4();
    INJECTED_ENTITIES.add({
      inject: [EntityManagerService],
      provide: id,
      useFactory(entityManager: EntityManagerService) {
        return new Proxy({} as ENTITY_STATE<ENTITY>, {
          get: (t, property: string) => {
            if (!entityManager.init) {
              return undefined;
            }
            const current = entityManager.byId<ENTITY>(entity);
            return current ? current[property] : undefined;
          },
          set(t, property: string) {
            // No really, bad developer
            throw new InternalServerErrorException(
              `Cannot modify entity property: ${property}`,
            );
          },
        });
      },
    });
    return Inject(id)(target, key, index);
  };
}
