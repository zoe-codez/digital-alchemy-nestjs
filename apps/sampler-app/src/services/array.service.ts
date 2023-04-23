import {
  ApplicationManagerService,
  PromptService,
  ScreenService,
  TextRenderingService,
} from "@digital-alchemy/tty";
import { faker } from "@faker-js/faker";
import { Injectable } from "@nestjs/common";

const LIST_LENGTH = 10;
const GENERAS: string[] = [];
while (GENERAS.length < LIST_LENGTH) {
  const item = faker.music.genre();
  if (!GENERAS.includes(item)) {
    GENERAS.push(item);
  }
}

@Injectable()
export class ArrayService {
  constructor(
    private readonly application: ApplicationManagerService,
    private readonly prompt: PromptService,
    private readonly screen: ScreenService,
    private readonly text: TextRenderingService,
  ) {}

  public async basic(): Promise<void> {
    this.application.setHeader("TTY Sampler");
    await this.prompt.arrayBuilder<{
      foo: string;
      type: string;
      variety: string;
    }>({
      current: [],
      elements: [
        {
          default: "",
          path: "foo",
          type: "string",
        },
        {
          options: [
            { entry: ["Apple"] },
            { entry: ["Banana"] },
            { entry: ["Carrot"] },
            { entry: ["Dog"] },
          ],
          path: "type",
          type: "pick-one",
        },
        {
          default: [],
          options: GENERAS.map(i => ({ entry: [i] })),
          path: "variety",
          type: "pick-many",
        },
      ],
      labelPath: "foo",
      typePath: "type",
    });
  }
}
