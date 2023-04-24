import { Component, iComponent } from "../decorators";
import { KeyboardManagerService, ScreenService } from "../services";

@Component({ type: "confirm" })
export class ConfirmComponentService implements iComponent {
  constructor(
    private readonly screen: ScreenService,
    private readonly keyboard: KeyboardManagerService,
  ) {}

  private complete = false;
  private done: (state: boolean) => void;
  private initialState = false;
  private label = ``;

  public configure(
    config: {
      current?: boolean;
      label?: string;
    },
    callback,
  ): void {
    this.complete = false;
    this.done = callback;
    this.label = config.label;
    this.initialState = config.current;
    this.keyboard.setKeymap(
      this,
      new Map([
        [{ key: "y", render: false }, "accept"],
        [{ key: "n", render: false }, "deny"],
        [
          { description: "default answer", key: "enter", render: false },
          "selectDefault",
        ],
      ]),
    );
  }

  public onEnd(): void {
    this.complete = true;
  }

  public render(): void {
    if (this.complete) {
      return;
    }
    this.screen.render(`${this.label} (${this.initialState ? "Y/n" : "y/N"})`);
  }

  protected accept(): void {
    this.complete = true;
    this.done(true);
  }

  protected deny(): void {
    this.complete = true;
    this.done(false);
  }

  protected selectDefault() {
    if (this.initialState) {
      this.accept();
      return;
    }
    this.deny();
  }
}
