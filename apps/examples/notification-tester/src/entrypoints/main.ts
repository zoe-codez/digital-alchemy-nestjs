import { QuickScript } from "@digital-alchemy/boilerplate";
import { GotifyApp, MessagePriority, SendFrom } from "@digital-alchemy/gotify";
import { SECOND } from "@digital-alchemy/utilities";

enum GotifyChannels {
  experiments = "experiments",
  reminders = "reminders",
  automation = "automation",
  security = "security",
}

@QuickScript()
export class ExampleApplication {
  constructor(
    @SendFrom(GotifyChannels.experiments)
    private readonly notify: GotifyApp,
  ) {}

  protected onModuleInit() {
    setInterval(() => {
      this.notify({
        message: "Sending messages through @digital-alchemy/gotify",
        priority: MessagePriority.high,
        title: "I'm alive!",
      });
    }, SECOND);
  }
}
