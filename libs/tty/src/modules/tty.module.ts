import { DiscoveryModule } from "@nestjs/core";
import { LibraryModule, RegisterCache } from "@steggy/boilerplate";

import {
  AcknowledgeComponentService,
  ArrayBuilderService,
  ConfirmComponentService,
  MenuComponentService,
  ObjectBuilderComponentService,
  PickManyComponentService,
} from "../components";
import {
  DEFAULT_HEADER_FONT,
  HELP,
  LIB_TTY,
  PAGE_SIZE,
  SECONDARY_HEADER_FONT,
  TABLE_RENDER_ROWS,
  USE_FONTAWESOME_ICONS,
} from "../config";
import {
  DateEditorService,
  NumberEditorService,
  PasswordEditorService,
  StringEditorService,
} from "../editors";
import {
  ApplicationManagerService,
  ChartingService,
  ColorsService,
  ComparisonToolsService,
  ComponentExplorerService,
  EditorExplorerService,
  EnvironmentService,
  FormService,
  GitService,
  IconService,
  KeyboardManagerService,
  KeymapService,
  LayoutManagerService,
  PromptService,
  ScreenService,
  StackService,
  SyncLoggerService,
  TableService,
  TerminalHelpService,
  TextRenderingService,
} from "../services";

@LibraryModule({
  configuration: {
    [DEFAULT_HEADER_FONT]: {
      default: "ANSI Regular",
      description: "Figlet font",
      type: "string",
    },
    [HELP]: {
      default: false,
      description:
        "Intended for consumption as cli switch (--help). Performs early abort and prints available cli switches to console",
      type: "boolean",
    },
    [PAGE_SIZE]: {
      default: 20,
      description: "Item quantity in menus / lists",
      type: "number",
    },
    [SECONDARY_HEADER_FONT]: {
      default: "Pagga",
      description: "Figlet font",
      type: "string",
    },
    [TABLE_RENDER_ROWS]: {
      default: 20,
      description:
        "Default quantity of rows to render in prompts like arrayBuilder",
      type: "number",
    },
    [USE_FONTAWESOME_ICONS]: {
      default: true,
      description:
        "Utilize font awesome icons in prompts. Requires font to be installed.",
      type: "boolean",
    },
  },
  exports: [
    ApplicationManagerService,
    ChartingService,
    ColorsService,
    ComparisonToolsService,
    EnvironmentService,
    GitService,
    KeymapService,
    LayoutManagerService,
    PromptService,
    ScreenService,
    StackService,
    SyncLoggerService,
    TableService,
    TextRenderingService,
  ],
  imports: [DiscoveryModule, RegisterCache()],
  library: LIB_TTY,
  providers: [
    AcknowledgeComponentService,
    ApplicationManagerService,
    ArrayBuilderService,
    ChartingService,
    ColorsService,
    ComparisonToolsService,
    ComponentExplorerService,
    ConfirmComponentService,
    DateEditorService,
    EditorExplorerService,
    EnvironmentService,
    FormService,
    GitService,
    IconService,
    KeyboardManagerService,
    KeymapService,
    LayoutManagerService,
    MenuComponentService,
    NumberEditorService,
    ObjectBuilderComponentService,
    PasswordEditorService,
    PickManyComponentService,
    PromptService,
    ScreenService,
    StackService,
    StringEditorService,
    SyncLoggerService,
    TableService,
    TerminalHelpService,
    TextRenderingService,
  ],
})
export class TTYModule {}
