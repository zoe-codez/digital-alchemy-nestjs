import { ALL_GLOBAL_SCENES } from "./utility";

export type AutomationLogicModuleConfiguration = {
  global_scenes?: Record<string, RoomScene>;
  room_configuration?: Record<string, RoomConfiguration>;
};

export type RoomConfiguration = {
  scenes?: Record<ALL_GLOBAL_SCENES, RoomScene>;
  /**
   * Friendly name
   */
  name?: string;
};
export type RoomScene = {
  friendly_name?: string;
};
