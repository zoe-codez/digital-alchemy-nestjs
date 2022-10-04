import { Test } from "@steggy/testing";

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
    const { loaded, quickMap } = LibraryModule;
    const { configuration } = loaded.get(quickMap.get(project));
    expect(configuration).toEqual(
      expect.objectContaining(options.configuration),
    );
  });
});
