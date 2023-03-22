import { Test } from "@digital-alchemy/testing";
import { is } from "@digital-alchemy/utilities";
import { homedir } from "os";
import { join } from "path";
import { cwd } from "process";

import { WorkspaceService } from "../services";

describe("Workspace", () => {
  let workspaceService: WorkspaceService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({}).compile();

    workspaceService = app.get<WorkspaceService>(WorkspaceService);
  });

  it("should exist", () => {
    expect(workspaceService).toBeDefined();
  });

  it("includes ~/.config files in paths list", () => {
    const app = "foo";
    const found = workspaceService.configFilePaths(app);
    const home = homedir();
    expect(found).toEqual(
      expect.arrayContaining([
        `${home}/.config/${app}`,
        `${home}/.config/${app}.json`,
        `${home}/.config/${app}.ini`,
        `${home}/.config/${app}.yaml`,
        `${home}/.config/${app}/config`,
        `${home}/.config/${app}/config.json`,
        `${home}/.config/${app}/config.ini`,
        `${home}/.config/${app}/config.yaml`,
      ]),
    );
  });

  it("includes /etc files in paths list", () => {
    const app = "foo";
    const found = workspaceService.configFilePaths(app);
    expect(found).toEqual(
      expect.arrayContaining([
        `/etc/${app}/config`,
        `/etc/${app}/config.json`,
        `/etc/${app}/config.ini`,
        `/etc/${app}/config.yaml`,
        `/etc/${app}rc`,
        `/etc/${app}rc.json`,
        `/etc/${app}rc.ini`,
        `/etc/${app}rc.yaml`,
      ]),
    );
  });

  it("includes local files in paths list", () => {
    const app = "foo";
    const found = workspaceService.configFilePaths(app);
    let current = cwd();
    let next: string;
    const out: string[] = [];
    while (!is.empty(current)) {
      out.push(join(current, `.${app}rc`));
      next = join(current, "..");
      if (next === current) {
        break;
      }
      current = next;
    }
    expect(found).toEqual(expect.arrayContaining(out));
  });
});
