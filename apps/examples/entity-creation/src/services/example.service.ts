import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";
import { EntityRegistryService } from "@steggy/home-assistant";

@Injectable()
export class ExampleService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly registry: EntityRegistryService,
  ) {}

  protected onPostInit() {
    const list = this.registry.applicationYaml();
    console.log(list);
    //
  }
}
