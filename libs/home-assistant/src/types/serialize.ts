import { ClassConstructor, plainToInstance } from "class-transformer";
import { IsObject, IsString, ValidateNested } from "class-validator";
import { gunzipSync, gzipSync } from "zlib";

import { HomeAssistantModuleConfiguration } from "./module";

/**
 * Minimal set of functions to serialize / unserialize misc data.
 *
 * Utilizes with a gzip + base64 combo to reduce the size by approx 75%
 *
 *  **Example comparison**
 *  - plain json: `140559` characters
 *  - base64: `36616` characters
 */
export const SERIALIZE = {
  serialize: (data: unknown): string =>
    gzipSync(Buffer.from(JSON.stringify(data), "utf8")).toString("base64"),
  unserialize: <TYPE extends object = object>(
    /** Raw text to unserialize */
    data: string,
    /**
     * Annotated class for class-transformer to cast to.
     * Can be used for object validation (don't trust data!)
     * */
    dto?: ClassConstructor<TYPE>,
  ): TYPE => {
    try {
      const out = JSON.parse(
        gunzipSync(Buffer.from(data, "base64")).toString(),
      );
      if (dto) {
        return plainToInstance(dto, out);
      }
      return out;
    } catch {
      return undefined;
    }
  },
};

export type InjectedPushConfig = {
  storage: () => [name: string, data: object];
  yaml: (current_config: object) => object;
};

export class PluginConfig {
  @IsString()
  public name: string;
  @IsObject()
  public storage: object;
  @IsString()
  public yaml: [filename: string, data: object][];
}

export class HassSteggySerializeState {
  @IsString()
  public application: string;
  @ValidateNested()
  public configuration: HomeAssistantModuleConfiguration;
  @ValidateNested()
  public plugins: PluginConfig[];
}
