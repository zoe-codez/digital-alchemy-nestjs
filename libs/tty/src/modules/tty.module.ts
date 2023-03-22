import { DiscoveryModule } from "@nestjs/core";
import { LibraryModule, RegisterCache } from "@digital-alchemy/boilerplate";

import {
  AcknowledgeComponentService,
  ArrayBuilderService,
  ConfirmComponentService,
  MenuComponentService,
  ObjectBuilderComponentService,
  PickManyComponentService,
} from "../components";
import {
  APPLICATION_PADDING_LEFT,
  APPLICATION_PADDING_TOP,
  DEFAULT_PROMPT_WIDTH,
  HEADER_COLOR_PRIMARY,
  HEADER_COLOR_SECONDARY,
  HEADER_FONT_PRIMARY,
  HEADER_FONT_SECONDARY,
  HELP,
  LIB_TTY,
  PAGE_SIZE,
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
  ErrorService,
  FormService,
  IconService,
  KeyboardManagerService,
  KeymapService,
  PromptService,
  ScreenService,
  TableService,
  TerminalHelpService,
  TextRenderingService,
} from "../services";

@LibraryModule({
  configuration: {
    [APPLICATION_PADDING_LEFT]: {
      default: 2,
      description: "Automatic offsets for header. POC / deprecated",
      type: "number",
    },
    [APPLICATION_PADDING_TOP]: {
      default: 1,
      description: "Automatic offsets for header. POC / deprecated",
      type: "number",
    },
    [DEFAULT_PROMPT_WIDTH]: {
      default: 50,
      description: "Box width for prompts short text inputs",
      type: "number",
    },
    [HEADER_COLOR_PRIMARY]: {
      default: "cyan",
      type: "string",
    },
    [HEADER_COLOR_SECONDARY]: {
      default: "magenta",
      type: "string",
    },
    [HEADER_FONT_PRIMARY]: {
      default: "ANSI Regular",
      description: "Figlet font",
      type: "string",
    },
    [HEADER_FONT_SECONDARY]: {
      default: "Pagga",
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
    ErrorService,
    IconService,
    KeymapService,
    PromptService,
    ScreenService,
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
    ErrorService,
    FormService,
    IconService,
    KeyboardManagerService,
    KeymapService,
    MenuComponentService,
    NumberEditorService,
    ObjectBuilderComponentService,
    PasswordEditorService,
    PickManyComponentService,
    PromptService,
    ScreenService,
    StringEditorService,
    TableService,
    TerminalHelpService,
    TextRenderingService,
  ],
})
export class TTYModule {}
