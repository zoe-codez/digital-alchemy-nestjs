import { Test } from "@steggy/test";

import { LibraryModule, QuickScriptOptions } from "../decorators";

describe("Boilerplate", () => {
  it("provides back bootstrap options", async () => {
    const project = "boilerplate-spec";
    const options = {
      application: Symbol(project),
      configuration: {
        foo: { type: "string" },
      },
    } as QuickScriptOptions;
    await Test.createTestingModule({ ...options }).compile();
    const found = LibraryModule.configs.get(project).configuration;
    expect(found).toEqual(expect.objectContaining(options.configuration));
  });
});
