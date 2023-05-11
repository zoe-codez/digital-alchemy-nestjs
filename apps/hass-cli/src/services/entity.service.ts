import { CacheService } from "@digital-alchemy/boilerplate";
import {
  ALL_DOMAINS,
  domain,
  ENTITY_STATE,
  EntityRegistryService,
  GenericEntityDTO,
  HassFetchAPIService,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
import {
  ApplicationManagerService,
  IconService,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@digital-alchemy/tty";
import { is, TitleCase } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";
import chalk from "chalk";

type EntityMenuResult = { entity: GenericEntityDTO };
type DomainMenuResult = { domain: ALL_DOMAINS };
type MenuResult = string | EntityMenuResult | DomainMenuResult;

const HIDDEN_DOMAINS = "HASS_CLI-ENTITIY-HIDDEN_DOMAINS";

@Injectable()
export class EntityService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly fetch: HassFetchAPIService,
    private readonly text: TextRenderingService,
    private readonly registry: EntityRegistryService,
    private readonly screen: ScreenService,
    private readonly cache: CacheService,
    private readonly icons: IconService,
  ) {}

  private entities: ENTITY_STATE<PICK_ENTITY>[];
  private lastRefresh: Date;

  public async exec(): Promise<void> {
    this.application.setHeader("Entity List");
    this.entities ??= await this.fetch.getAllEntities();
    this.lastRefresh ??= new Date();

    const HASS_DOMAINS = is.unique(
      this.entities.map(entity => domain(entity.entity_id as PICK_ENTITY)),
    ) as ALL_DOMAINS[];

    let domains = await this.cache.get<ALL_DOMAINS[]>(HIDDEN_DOMAINS, []);

    const action = await this.prompt.menu<MenuResult>({
      helpNotes: [
        "Entity information is cached for this run of the script unless manually refreshed.",
        chalk`{bold Last refresh:} {green ${this.lastRefresh.toLocaleString()}}`,
        ``,
      ],
      keyMap: {
        "[": [chalk`all domains {red off}`, "all_off"],
        "]": [chalk`all domains {green on}`, "all_on"],
        escape: ["done"],
        r: [chalk.green`refresh entity data`, "refresh"],
      },
      left: this.entities
        .filter(
          // Only allow entities not on the disallowed list
          entity => !domains.includes(domain(entity.entity_id as PICK_ENTITY)),
        )
        .map(entity => ({
          entry: [entity.entity_id, { entity }],
          helpText: entity,
          type: TitleCase(domain(entity.entity_id as PICK_ENTITY)),
        })),
      leftHeader: "Entity List",
      restore: {
        id: "HASS_CLI_INSPECT_ENTITY",
        idProperty: ["entity.entity_id", "domain"],
        type: "value",
      },
      right: HASS_DOMAINS.map(domain => ({
        entry: [TitleCase(domain), { domain }],
        icon: this.icons.getIcon(
          domains.includes(domain) ? "toggle_off" : "toggle_on",
        ),
        type: "Domain Toggle",
      })),
      rightHeader: "Filter",
      search: { right: false },
    });

    switch (action) {
      case "all_on":
        await this.cache.set(HIDDEN_DOMAINS, []);
        break;
      case "all_off":
        await this.cache.set(HIDDEN_DOMAINS, HASS_DOMAINS);
        break;
      case "done":
        return;
      case "refresh": {
        this.entities = undefined;
        this.lastRefresh = undefined;
        break;
      }
    }
    if (!is.string(action)) {
      if ("entity" in action) {
        await this.entityDetails(action.entity);
      }
      if ("domain" in action) {
        const exists = domains.includes(action.domain);
        if (exists) {
          domains = domains.filter(i => i !== action.domain);
        } else {
          domains.push(action.domain);
        }
        await this.cache.set(HIDDEN_DOMAINS, domains);
      }
    }
    await this.exec();
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
        break;
      case "hide":
        await this.registry.hide(id);
        break;
      // case "area":
      //   return;
      case "change_id":
        const new_id = (await this.prompt.string({
          current: id,
          label: "New entity_id",
        })) as PICK_ENTITY;
        await this.registry.setEntityId(id, new_id);
        break;
      case "change_name":
        const name = await this.prompt.string({
          current: current.name,
          label: "New friendly name",
        });
        await this.registry.setFriendlyName(id, name);
        break;
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
