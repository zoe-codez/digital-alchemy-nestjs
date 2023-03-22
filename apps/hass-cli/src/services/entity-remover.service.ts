import { Injectable } from "@nestjs/common";
import {
  ENTITY_STATE,
  EntityRegistryService,
  HassFetchAPIService,
  PICK_ENTITY,
} from "@digital-alchemy/home-assistant";
import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
} from "@digital-alchemy/tty";
import { eachSeries, is } from "@digital-alchemy/utilities";
import chalk from "chalk";

const TITLE = "Entity Remover";

@Injectable()
export class EntityRemoverService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly fetch: HassFetchAPIService,
    private readonly registry: EntityRegistryService,
    private readonly screen: ScreenService,
  ) {}

  private entities: ENTITY_STATE<PICK_ENTITY>[];
  private lastRefresh: Date;

  public async exec(): Promise<void> {
    this.application.setHeader(TITLE);
    this.entities = await this.fetch.getAllEntities();
    this.screen.printLine(chalk` {blue >} {cyan Select the entries to remove}`);
    this.screen.printLine(
      chalk` {blue >} {yellow You will be asked to confirm twice before removal happens}\n`,
    );
    const list = await this.prompt.pickMany<PICK_ENTITY>({
      source: this.entities
        .filter(i => i.state === "unavailable")
        .map(entity => {
          return {
            entry: [entity.entity_id],
            helpText: `Current state: ${entity.state}`,
          };
        }),
    });
    if (is.empty(list)) {
      return;
    }
    this.application.setHeader(TITLE, "Confirmation 1");
    this.screen.printLine(
      chalk`You are about to remove {magenta ${list.length} entities}`,
    );
    list.forEach(id =>
      this.screen.printLine(chalk` {yellow - } {red.bold ${id}}`),
    );
    const confirm1 = await this.prompt.confirm({
      current: false,
      label: "Are you sure you want to remove these?",
    });
    if (!confirm1) {
      return;
    }
    this.application.setHeader(TITLE, "Confirmation 2");
    this.screen.printLine(
      chalk`Are you super sure? {bgRed.bold.white   THIS IS A DESTRUCTIVE OPERATION   }`,
    );
    const confirm2 = await this.prompt.confirm({
      current: false,
      label: "Remove entities?",
    });
    if (!confirm2) {
      return;
    }
    this.application.setHeader(TITLE, "Removing entities");
    await eachSeries(list, async (entity_id: PICK_ENTITY) => {
      this.screen.printLine(
        chalk` {green >}{yellow >}{red >} {red.bold Removing entity:} {cyan ${entity_id}}`,
      );
      await this.registry.remove(entity_id);
    });
    await this.prompt.acknowledge({ label: "Done" });
  }
}
