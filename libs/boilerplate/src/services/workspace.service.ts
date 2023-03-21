import { INVERT_VALUE, is, START } from "@digital-alchemy/utilities";
import { Inject, Injectable } from "@nestjs/common";
import JSON from "comment-json";
import { existsSync, readFileSync } from "fs";
import { decode } from "ini";
import { load } from "js-yaml";
import { homedir } from "os";
import { join } from "path";
import { cwd, platform } from "process";

import { AbstractConfig } from "../types/configuration";
import { ACTIVE_APPLICATION } from "../types/constants";

const extensions = ["json", "ini", "yaml", "yml"];

/**
 * Tools for describing the current environment the code is running in
 */
@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(ACTIVE_APPLICATION) private readonly application: string,
  ) {}

  private isWindows = platform === "win32";

  /**
   * Find files at:
   * - /etc/{name}/config
   * - /etc/{name}/config.json
   * - /etc/{name}/config.ini
   * - /etc/{name}/config.yaml
   * - /etc/{name}rc
   * - /etc/{name}rc.json
   * - /etc/{name}rc.ini
   * - /etc/{name}rc.yaml
   * - cwd()/.{name}rc
   * - Recursively to system root
   * - cwd()/../.{name}rc
   * - ~/.config/{name}
   * - ~/.config/{name}.json
   * - ~/.config/{name}.ini
   * - ~/.config/{name}.yaml
   * - ~/.config/{name}/config
   * - ~/.config/{name}/config.json
   * - ~/.config/{name}/config.ini
   * - ~/.config/{name}/config.yaml
   */
  public configFilePaths(name = this.application): string[] {
    const out: string[] = [];
    if (!this.isWindows) {
      out.push(
        ...this.withExtensions(join(`/etc`, name, "config")),
        ...this.withExtensions(join(`/etc`, `${name}rc`)),
      );
    }
    let current = cwd();
    let next: string;
    while (!is.empty(current)) {
      out.push(join(current, `.${name}rc`));
      next = join(current, "..");
      if (next === current) {
        break;
      }
      current = next;
    }
    out.push(
      ...this.withExtensions(join(homedir(), ".config", name)),
      ...this.withExtensions(join(homedir(), ".config", name, "config")),
    );
    return out;
  }

  public isApplication(project: string): boolean {
    return this.application === project;
  }

  public isProject(project: string): boolean {
    return this.application !== project;
  }

  public loadConfigFromFile(
    out: Map<string, AbstractConfig>,
    filePath: string,
  ) {
    if (!existsSync(filePath)) {
      return out;
    }
    const fileContent = readFileSync(filePath, "utf8").trim();
    const hasExtension = extensions.some(extension => {
      if (
        filePath.slice(extension.length * INVERT_VALUE).toLowerCase() ===
        extension
      ) {
        switch (extension) {
          case "ini":
            out.set(filePath, decode(fileContent));
            return true;
          case "yaml":
          case "yml":
            out.set(filePath, load(fileContent));
            return true;
          case "json":
            out.set(filePath, JSON.parse(fileContent) as AbstractConfig);
            return true;
        }
      }
      return false;
    });
    if (hasExtension) {
      return undefined;
    }
    // Guessing JSON
    if (fileContent[START] === "{") {
      out.set(filePath, JSON.parse(fileContent) as AbstractConfig);
      return true;
    }
    // Guessing yaml
    try {
      const content = load(fileContent);
      if (is.object(content)) {
        out.set(filePath, content);
        return true;
      }
    } catch {
      // Is not a yaml file
    }
    // Final fallback: INI
    out.set(filePath, decode(fileContent));
    return true;
  }

  /**
   * workspaceService.configFilePaths can provide a good default list
   */
  public loadMergedConfig(
    list: string[] = [],
  ): [Map<string, AbstractConfig>, string[]] {
    const out = new Map<string, AbstractConfig>();
    const files: string[] = [];
    list.forEach(filePath => {
      this.loadConfigFromFile(out, filePath);
      files.push(filePath);
    });
    return [out, files];
  }

  private withExtensions(path: string): string[] {
    return [path, ...extensions.map(i => `${path}.${i}`)];
  }
}
