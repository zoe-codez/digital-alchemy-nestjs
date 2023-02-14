import { INestApplication, Inject, Injectable } from "@nestjs/common";
import {
  ACTIVE_APPLICATION,
  AutoLogService,
  InjectConfig,
  WorkspaceService,
} from "@steggy/boilerplate";

import { SWAGGER_PATH } from "../config";

@Injectable()
export class SwaggerService {
  constructor(
    @Inject(ACTIVE_APPLICATION) private readonly activeApplication: string,
    private readonly logger: AutoLogService,
    @InjectConfig(SWAGGER_PATH) private readonly swaggerPath: string,
    private readonly workspace: WorkspaceService,
  ) {}

  protected onApplicationBootstrap(): void {
    if (!this.swaggerPath) {
      return;
    }
    this.logger.warn(`Swagger available at {${this.swaggerPath}}`);
  }

  protected onPreInit(app: INestApplication): void {
    app;
    if (!this.swaggerPath) {
      return;
    }
    // this.workspace.initMetadata();
    // const data = this.workspace.PACKAGES.get(
    //   this.activeApplication.description,
    // );
    // const { displayName, description, version } = data ?? {};
    // const config = new DocumentBuilder()
    //   .setTitle(displayName ?? TitleCase(this.activeApplication.description))
    //   .setDescription(description ?? "")
    //   .setVersion(version ?? "")
    //   .build();
    // const document = SwaggerModule.createDocument(app, config);
    // SwaggerModule.setup(this.swaggerPath, app, document);
  }
}
