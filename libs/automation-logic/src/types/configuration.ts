import { ALL_GLOBAL_SCENES } from "./utility";

export type AutomationLogicModuleConfiguration = {
  global_scenes?: Record<string, boolean>;
  room_configuration?: Record<string, RoomConfiguration>;
};

export type RoomConfiguration = {
  /**
   * Friendly name
   */
  name?: string;
  /**
   * Global scenes are required to be declared within the room
   */
  scenes?: Record<ALL_GLOBAL_SCENES, RoomScene> & Record<string, RoomScene>;
};
export type RoomScene = {
  description?: string;
  friendly_name?: string;
};
