import { Injectable } from "@nestjs/common";
import {
  domain,
  EntityRegistryService,
  GenericEntityDTO,
  HassFetchAPIService,
  PICK_ENTITY,
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
    private readonly fetch: HassFetchAPIService,
    private readonly text: TextRenderingService,
    private readonly registry: EntityRegistryService,
    private readonly screen: ScreenService,
  ) {}

  private entities: GenericEntityDTO[];
  private lastRefresh: Date;

  public async exec(value?: MenuResult): Promise<void> {
    this.application.setHeader("Entity List");
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
        return {
          entry: [entity.entity_id, { entity }],
          helpText: [
            chalk`{bold Current State:} ${this.text.type(entity.state)}`,
            chalk`{bold Attributes:} `,
            this.text.type(entity.attributes),
          ].join(`\n`),
          type: TitleCase(domain(entity.entity_id as PICK_ENTITY)),
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
      await this.entityDetails(action.entity);
      return await this.exec(action);
    }
  }

  private async entityDetails(entity: GenericEntityDTO): Promise<void> {
    this.application.setHeader("Entity Information");
    const id = entity.entity_id as PICK_ENTITY;
    const current = await this.registry.byId(id);
    const action = await this.prompt.menu({
      keyMap: {
        escape: ["done"],
      },
      right: [
        {
          entry: ["Disable", "disable"],
          helpText: chalk`{blue.bold Lovelace}\nDisabled entities will not be added to Home Assistant.`,
        },
        {
          entry: ["Hide", "hide"],
          helpText: chalk`{blue.bold Lovelace}\nHidden entities will not be shown on your dashboard. Their history is still tracked and you can still interact with them with services.`,
        },
        // TODO: look up how to retrieve list of areas, this should be a pick-many, not a string
        // Add to `dynamic.ts`?
        // {
        //   entry: ["Set area", "area"],
        // },
        {
          entry: ["Set entity id", "change_id"],
        },
        {
          entry: ["Set friendly name", "change_name"],
        },
      ],
    });
    switch (action) {
      case "done":
        return;
      case "disable":
        await this.registry.disable(id);
        return;
      case "hide":
        await this.registry.hide(id);
        return;
      // case "area":
      //   return;
      case "change_id":
        const new_id = await this.prompt.string({
          current: id,
          label: "New entity_id",
        });
        await this.registry.setEntityId(id, new_id);
        return;
      case "change_name":
        const name = await this.prompt.string({
          current: current.name,
          label: "New friendly name",
        });
        await this.registry.setFriendlyName(id, name);
        return;
    }
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
