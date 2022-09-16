/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @nrwl/nx/enforce-module-boundaries */
import { Test } from "@steggy/test";

import { AutoConfigService } from "../services";

describe.skip("Bootstrap", () => {
  let configService: AutoConfigService;

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      // providers: [FooService],
    }).compile();

    configService = app.get<AutoConfigService>(AutoConfigService);
  });

  it("should always have configuration service", () => {
    expect(configService).toBeDefined();
  });
});
