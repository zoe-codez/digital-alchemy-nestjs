import { QuickScript } from "@steggy/boilerplate";
import JSON from "comment-json";
import dayjs from "dayjs";
import { readFileSync, writeFileSync } from "fs";
import { inc } from "semver";

@QuickScript()
export class BuildPipelineService {
  public exec(): void {
    const packageJSON = JSON.parse(
      readFileSync("package.json", "utf8"),
    ) as unknown as {
      version: string;
    };
    const prefix = dayjs().format("YY.ww");
    packageJSON.version = packageJSON.version.startsWith(prefix)
      ? inc(packageJSON.version, "patch")
      : `${prefix}.0`;
    writeFileSync(
      "package.json",
      JSON.stringify(packageJSON, undefined, "  ") + `\n`,
    );
  }
}
