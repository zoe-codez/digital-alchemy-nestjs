import { LibraryModule } from "../../decorators";
import { COLLISION_LIBRARY, TEST_CONFIG_A, TEST_CONFIG_B } from "../types";

@LibraryModule({
  configuration: {
    [TEST_CONFIG_A]: { default: TEST_CONFIG_A, type: "string" },
  },
  library: COLLISION_LIBRARY,
})
export class CollisionAModule {}

@LibraryModule({
  configuration: {
    [TEST_CONFIG_B]: { default: TEST_CONFIG_B, type: "string" },
  },
  library: COLLISION_LIBRARY,
})
export class CollisionBModule {}
