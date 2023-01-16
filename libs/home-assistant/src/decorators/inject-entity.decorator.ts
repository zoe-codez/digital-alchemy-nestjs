import { Inject, InternalServerErrorException, Provider } from "@nestjs/common";
import { v4 } from "uuid";

import { ENTITY_STATE, PICK_ENTITY } from "../contracts";
import { EntityManagerService } from "../services";

export const INJECTED_ENTITIES = new Set<Provider>();

// Don't even try to include a real code example. The inline tsdoc > markdown thing in vscode is a flaming piece of shit
// It will not render right

/**
 * Inject a **`READ ONLY`** entity proxy object that will perform lookups against the latest information available for an entity.
 * No need to perform repeated lookups with `EntityManagerService` to get the latest state, just inject the proxy and start using
 *
 * Combine with `ENTITY_STATE` to receive type definitions.
 *
 * ### Example usage
 *
 * `@InjectEntity("climate.upstairs")`
 *
 * `private readonly climateUpstairs: ENTITY_STATE<"climate.upstairs">`
 */
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
