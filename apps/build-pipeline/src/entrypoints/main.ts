import { InjectConfig, QuickScript } from "@digital-alchemy/boilerplate";
import { INCREMENT, START } from "@digital-alchemy/utilities";
import JSON from "comment-json";
import dayjs from "dayjs";
import execa from "execa";
import { readFileSync, writeFileSync } from "fs";
import { inc } from "semver";
import { PackageJson } from "type-fest";

const root = "package.json";

// 23.10.0-dev.1

@QuickScript()
export class BuildPipelineService {
  constructor(
    @InjectConfig("DEV", { default: false, type: "boolean" })
    private readonly developmentBuild: boolean,
  ) {}

  public async exec(): Promise<void> {
    // ? Bump root package.json version
    // * Load root package
    const rootPackage = JSON.parse(readFileSync(root, "utf8")) as PackageJson;
    const currentVersion = rootPackage.version;

    // * Bump version
    const prefix = dayjs().format("YY.ww").replace(".0", ".");
    rootPackage.version = currentVersion.startsWith(prefix)
      ? inc(rootPackage.version, "patch")
      : `${prefix}.0`;
    if (this.developmentBuild) {
      const number = currentVersion.includes("dev")
        ? Number(currentVersion.split(".").pop()) + INCREMENT
        : START;
      rootPackage.version += `-dev.${number}`;
    }

    // * Write back
    writeFileSync(root, JSON.stringify(rootPackage, undefined, "  ") + `\n`);

    // ? Match to library versions
    // * Seek out all project files
    const projectFiles = await execa("find", [
      ".",
      // eslint-disable-next-line spellcheck/spell-checker
      "-iname",
      `*project.json`,
      "-not",
      "-path",
      "./node_modules",
    ]);

    // * Iterate over list, updating the package files in their base dirs
    projectFiles.stdout.split("\n").forEach(project => {
      const packageFile = project.replace("project.json", "package.json");
      const content = JSON.parse(
        readFileSync(packageFile, "utf8"),
      ) as PackageJson;
      content.version = rootPackage.version;
      writeFileSync(
        packageFile,
        JSON.stringify(content, undefined, "  ") + `\n`,
      );
    });

    // * Directly output the new version to stdout for use with pipeline script
    // eslint-disable-next-line no-console
    console.log(rootPackage.version);
  }
}
