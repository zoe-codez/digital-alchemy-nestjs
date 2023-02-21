import { ParameterDecoratorFactory } from "@steggy/utilities";
import { v4 } from "uuid";

import { EntityManagerService } from "../services";
import { ENTITY_STATE, PICK_ENTITY } from "../types";

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
export const InjectEntity = ParameterDecoratorFactory<PICK_ENTITY>(
  "INJECT_ENTITY",
  entity => ({
    inject: [EntityManagerService],
    provide: v4(),
    useFactory(entityManager: EntityManagerService) {
      return new Proxy({} as ENTITY_STATE<typeof entity>, {
        get: (t, property: string) =>
          entityManager["proxyGetLogic"](entity, property),
        set: (t, property: string, value: unknown) =>
          entityManager["proxySetLogic"](entity, property, value),
      });
    },
  }),
);
