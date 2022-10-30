import { QuickScript } from "@steggy/boilerplate";
import {
  GenericEntityDTO,
  HomeAssistantFetchAPIService,
  HomeAssistantModule,
} from "@steggy/home-assistant";
import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TextRenderingService,
  TTYModule,
} from "@steggy/tty";

@QuickScript({
  application: Symbol("entity-inspector"),
  imports: [HomeAssistantModule, TTYModule],
})
export class EntityInspector {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly fetch: HomeAssistantFetchAPIService,
    private readonly textRendering: TextRenderingService,
    private readonly screen: ScreenService,
  ) {}

  private entities: GenericEntityDTO[];

  public async exec(value: string): Promise<void> {
    this.application.setHeader("Entity Inspector");
    const action = await this.prompt.menu({
      condensed: true,
      keyMap: { escape: ["done"] },
      right: [{ entry: ["Current state by id", "id"] }, { entry: ["done"] }],
      value,
    });
    if (action === "done") {
      return;
    }
    if (action === "id") {
      await this.printEntity();
      return await this.exec(action);
    }
  }

  protected async onModuleInit(): Promise<void> {
    this.entities = await this.fetch.getAllEntities();
  }

  private async printEntity(): Promise<void> {
    const item = await this.prompt.pickOne(
      "Pick an entity",
      this.entities.map(i => {
        return { entry: [i.entity_id, i] };
      }),
    );
    this.screen.printLine(this.textRendering.type(item));
    await this.prompt.acknowledge();
  }
}
