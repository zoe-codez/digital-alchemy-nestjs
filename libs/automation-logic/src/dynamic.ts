import { iSceneRoomOptions } from "./decorators";
import { ALL_ROOM_NAMES, AutomationLogicModuleConfiguration } from "./types";

export const MODULE_CONFIGURATION: AutomationLogicModuleConfiguration = {};

export const ROOM_MAPPINGS: Record<
  ALL_ROOM_NAMES,
  iSceneRoomOptions<ALL_ROOM_NAMES>
> = {};
