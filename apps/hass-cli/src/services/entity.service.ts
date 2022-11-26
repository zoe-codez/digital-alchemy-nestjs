import { Injectable } from "@nestjs/common";
import {
  GenericEntityDTO,
  HomeAssistantFetchAPIService,
} from "@steggy/home-assistant";
import {
  ApplicationManagerService,
  MainMenuEntry,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@steggy/tty";
import { is, TitleCase } from "@steggy/utilities";
import chalk from "chalk";

type EntityMenuResult = { entity: GenericEntityDTO };
type MenuResult = string | EntityMenuResult;

@Injectable()
export class EntityService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly fetch: HomeAssistantFetchAPIService,
    private readonly text: TextRenderingService,
    private readonly screen: ScreenService,
  ) {}

  private entities: GenericEntityDTO[];
  private lastRefresh: Date;

  public async exec(value?: MenuResult): Promise<void> {
    this.application.setHeader("Entity Information");
    this.entities ??= await this.fetch.getAllEntities();
    this.lastRefresh ??= new Date();

    const action = await this.prompt.menu<MenuResult>({
      keyMap: {
        escape: ["done"],
        r: {
          entry: ["Refresh entity data", "refresh"],
          highlight: "auto",
        },
      },
      left: this.entities.map(entity => {
        const [domain, id] = entity.entity_id.split(".");
        return {
          entry: [entity.attributes?.friendly_name || id, { entity }],
          helpText: [
            chalk`{bold Current State:} ${this.text.type(entity.state)}`,
            chalk`{bold Attributes:} `,
            this.text.type(entity.attributes),
          ].join(`\n`),
          type: TitleCase(domain),
        } as MainMenuEntry<EntityMenuResult>;
      }),
      leftHeader: "Entity List",
      right: [
        {
          entry: ["Refresh entity data", "refresh"],
          helpText: [
            "Entity information is cached for this run of the script unless manually refreshed.",
            chalk`{bold Last refresh:} {green ${this.lastRefresh.toLocaleString()}}`,
          ].join(`\n`),
        },
      ],
      rightHeader: "Control",
      value: this.getValue(value),
    });

    switch (action) {
      case "done":
        return;
      case "refresh":
        this.entities = undefined;
        this.lastRefresh = undefined;
        return await this.exec(action);
    }
    if (is.string(action)) {
      await this.prompt.acknowledge({ label: `Unknown action: ${action}` });
      return;
    }
    if ("entity" in action) {
      return await this.exec(action);
    }
  }

  private async entityDetails(entity: GenericEntityDTO): Promise<void> {
    // const entities = await this.fetch.getAllEntities();
    // const item = await this.prompt.pickOne({
    //   headerMessage: "Pick an entity",
    //   options: entities.map(i => {
    //     return { entry: [i.entity_id, i] };
    //   }),
    // });
    // this.screen.printLine(this.text.type(item));
    // await this.prompt.acknowledge();
  }

  /**
   * After a refresh, the object references won't line up anymore.
   *
   * This helps keep the cursor in the right place.
   */
  private getValue(value: MenuResult): MenuResult {
    if (!is.object(value)) {
      return value;
    }
    if ("entity" in value) {
      return {
        entity: this.entities.find(
          ({ entity_id }) => entity_id === value.entity.entity_id,
        ),
      };
    }
  }
}
