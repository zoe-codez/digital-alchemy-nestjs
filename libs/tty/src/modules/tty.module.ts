import { LibraryModule, RegisterCache } from "@digital-alchemy/boilerplate";
import { DiscoveryModule } from "@nestjs/core";

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
  DEFAULT_ACKNOWLEDGE_MESSAGE,
  DEFAULT_PROMPT_WIDTH,
  FUZZY_HIGHLIGHT,
  HEADER_COLOR_PRIMARY,
  HEADER_COLOR_SECONDARY,
  HEADER_FONT_PRIMARY,
  HEADER_FONT_SECONDARY,
  HELP,
  HELP_DIVIDER,
  KEYMAP_TICK,
  LIB_TTY,
  MENU_COLUMN_DIVIDER,
  MENU_ENTRY_NORMAL,
  MENU_ENTRY_OTHER,
  MENU_ENTRY_SELECTED,
  MENU_ENTRY_TYPE,
  MENU_ENTRY_TYPE_OTHER,
  MENU_SEARCHBOX_CONTENT,
  MENU_SEARCHBOX_EMPTY,
  MENU_SEARCHBOX_NORMAL,
  PAGE_SIZE,
  PROMPT_QUESTION,
  STRING_EDITOR_CONTENT,
  STRING_EDITOR_EMPTY,
  TABLE_RENDER_ROWS,
  TEXT_DEBUG_ARRAY_LENGTH,
  TEXT_DEBUG_DEPTH,
  USE_FONTAWESOME_ICONS,
} from "../config";
import {
  DateEditorService,
  NumberEditorService,
  PasswordEditorService,
  StringEditorService,
} from "../editors";
import { FontAwesomeIcons } from "../icons";
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
    [DEFAULT_ACKNOWLEDGE_MESSAGE]: {
      default: "Any key to continue",
      type: "string",
    },
    [DEFAULT_PROMPT_WIDTH]: {
      default: 50,
      description: "Box width for prompts short text inputs",
      type: "number",
    },
    [FUZZY_HIGHLIGHT]: {
      default: "red.bold.underline",
      description: "Chalk highlighting to apply to fuzzy search",
      type: "string",
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
    [HELP_DIVIDER]: {
      default: "blue.dim",
      type: "string",
    },
    [KEYMAP_TICK]: {
      default: `{blue.dim ${FontAwesomeIcons.caret_right} }`,
      type: "string",
    },
    [MENU_COLUMN_DIVIDER]: {
      default: "{blue.dim |}",
      type: "string",
    },
    [MENU_ENTRY_NORMAL]: {
      default: "white",
      type: "string",
    },
    [MENU_ENTRY_OTHER]: {
      default: "gray",
      type: "string",
    },
    [MENU_ENTRY_SELECTED]: {
      default: "bgBlueBright.black",
      type: "string",
    },
    [MENU_ENTRY_TYPE]: {
      default: "magenta.bold",
      type: "string",
    },
    [MENU_ENTRY_TYPE_OTHER]: {
      default: "gray.bold",
      type: "string",
    },
    [MENU_SEARCHBOX_CONTENT]: {
      default: "bgCyan",
      type: "string",
    },
    [MENU_SEARCHBOX_EMPTY]: {
      default: "bgBlue",
      type: "string",
    },
    [MENU_SEARCHBOX_NORMAL]: {
      default: "bgMagenta",
      type: "string",
    },
    [PAGE_SIZE]: {
      default: 20,
      description: "Item quantity in menus / lists",
      type: "number",
    },
    [PROMPT_QUESTION]: {
      default: `{blue ${FontAwesomeIcons.question}}`,
      type: "string",
    },
    [STRING_EDITOR_CONTENT]: {
      default: "bgWhite",
      type: "string",
    },
    [STRING_EDITOR_EMPTY]: {
      default: "bgBlue",
      type: "string",
    },
    [TABLE_RENDER_ROWS]: {
      default: 20,
      description:
        "Default quantity of rows to render in prompts like arrayBuilder",
      type: "number",
    },
    [TEXT_DEBUG_ARRAY_LENGTH]: {
      default: 2,
      description: "Util.inspect array length",
      type: "number",
    },
    [TEXT_DEBUG_DEPTH]: {
      default: 5,
      description: "Util.inspect object depth",
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
