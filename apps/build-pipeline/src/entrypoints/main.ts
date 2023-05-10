import { QuickScript } from "@digital-alchemy/boilerplate";
import JSON from "comment-json";
import dayjs from "dayjs";
import execa from "execa";
import { readFileSync, writeFileSync } from "fs";
import { inc } from "semver";
import { PackageJson } from "type-fest";

const root = "package.json";

@QuickScript()
export class BuildPipelineService {
  public async exec(): Promise<void> {
    // ? Bump root package.json version
    // * Load root package
    const rootPackage = JSON.parse(readFileSync(root, "utf8")) as PackageJson;

    // * Bump version
    const prefix = dayjs().format("YY.ww").replace(".0", ".");
    rootPackage.version = rootPackage.version.startsWith(prefix)
      ? inc(rootPackage.version, "patch")
      : `${prefix}.0`;

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
  }
}
