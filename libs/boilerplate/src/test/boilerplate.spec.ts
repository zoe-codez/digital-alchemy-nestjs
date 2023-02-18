import { Test } from "@steggy/testing";

import { QuickScriptOptions } from "../decorators";
import { AutoConfigService } from "../services";

describe("Boilerplate", () => {
  it("provides back bootstrap options", async () => {
    const project = "boilerplate-spec";
    const options = {
      application: project,
      configuration: {
        foo: { type: "string" },
      },
    } as QuickScriptOptions;
    const app = await Test.createTestingModule({ ...options }).compile();
    const configService = app.get(AutoConfigService);

    expect(configService.configDefinitions.get(project)).toEqual(
      expect.objectContaining(options.configuration),
    );
  });
});
