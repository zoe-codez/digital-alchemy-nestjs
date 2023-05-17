import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

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
  storage: () => [name: string, data: StorageWriteBack];
  yaml: (basePath: string) => InjectYamlReturn;
};

export class PluginConfig<CONFIGURATION extends object = object> {
  @IsObject()
  @IsOptional()
  public configuration?: CONFIGURATION;
  @IsString()
  public name: string;
  @IsObject()
  public storage: [name: string, data: StorageWriteBack];
}

export class HassDigitalAlchemySerializeState {
  @IsString()
  public application: string;
  @ValidateNested()
  public plugins: PluginConfig[];
}
