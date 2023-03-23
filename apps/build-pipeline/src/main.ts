/* eslint-disable sonarjs/no-duplicate-string */
import { QuickScript } from "@digital-alchemy/boilerplate";
import JSON from "comment-json";
import dayjs from "dayjs";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { inc } from "semver";

@QuickScript()
export class BuildPipelineService {
  public exec(): void {
    const rootPackage = JSON.parse(
      readFileSync("package.json", "utf8"),
    ) as unknown as {
      version: string;
    };
    const prefix = dayjs().format("YY.ww").replace(".0", ".");
    rootPackage.version = rootPackage.version.startsWith(prefix)
      ? inc(rootPackage.version, "patch")
      : `${prefix}.0`;
    writeFileSync(
      "package.json",
      JSON.stringify(rootPackage, undefined, "  ") + `\n`,
    );

    const workspace = JSON.parse(
      readFileSync("workspace.json", "utf8"),
    ) as unknown as {
      projects: Record<string, string>;
    };
    Object.values(workspace.projects).forEach(base => {
      const packageJSON = JSON.parse(
        readFileSync(join(base, "package.json"), "utf8"),
      ) as unknown as {
        version: string;
      };
      packageJSON.version = rootPackage.version;
      writeFileSync(
        join(base, "package.json"),
        JSON.stringify(packageJSON, undefined, "  ") + `\n`,
      );
    });
  }
}
