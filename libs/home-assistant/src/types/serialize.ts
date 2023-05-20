import { IsObject, IsString, ValidateNested } from "class-validator";

import { HomeAssistantModuleConfiguration } from "./module";

type InjectYamlReturn = {
  root_include: string;
};

type StorageWriteBack = {
  /**
   * Target typescript file.
   *
   * > `/path/to/file.d.ts`
   */
  target: string;
  /**
   * Contents for target
   */
  typesData: string;
};

export type InjectedPushConfig = {
  storage?: () => [name: string, data: StorageWriteBack];
  yaml: (basePath: string) => InjectYamlReturn;
};

export class PluginConfig {
  @IsString()
  public name: string;
  @IsObject()
  public storage: [name: string, data: StorageWriteBack];
}

export class HassDigitalAlchemySerializeState {
  @IsString()
  public application: string;
  @ValidateNested()
  public configuration: HomeAssistantModuleConfiguration;
  @ValidateNested()
  public plugins: PluginConfig[];
}
