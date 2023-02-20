import { Inject, Provider } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { v4 } from "uuid";

import { EntityManagerService } from "../services";
import { ENTITY_STATE, PICK_ENTITY } from "../types";

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
      inject: [EntityManagerService, AutoLogService],
      provide: id,
      useFactory(entityManager: EntityManagerService, logger: AutoLogService) {
        logger["context"] = `InjectEntity(${entity})`;
        return new Proxy({} as ENTITY_STATE<ENTITY>, {
          get: (t, property: string) => {
            if (!entityManager.init) {
              return undefined;
            }
            const current = entityManager.byId<ENTITY>(entity);
            if (!current) {
              // Theory: attributes only gets accessed to use the sub-properties
              // It is frequent to forget optional chains `attribute?.friendly_name`
              // Providing an object by default reduces crashes
              // Doesn't matter for other properties, which aren't directly chained (or as generally used)
              const defaultValue = property === "attributes" ? {} : undefined;
              logger.error(
                { defaultValue },
                `Proxy cannot find entity to provide {${property}}. Is application in a valid state?`,
              );
              return defaultValue;
            }
            return current ? current[property] : undefined;
          },
          set(t, property: string, value: unknown) {
            // ... should it? Seems like a bad idea
            logger.error(
              { property, value },
              `Entity proxy does not accept value setting`,
            );
            return false;
          },
        });
      },
    });
    return Inject(id)(target, key, index);
  };
}
