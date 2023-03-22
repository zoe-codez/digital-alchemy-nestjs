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
  /**
   * Ensure entities are maintained as the scene says they should be
   *
   * - Automatically revert changes made by pesky humans
   *   - how dare they?!
   *
   * - Ensure lights match the brightness / color the scene says they should be
   *   - sometimes things don't fully make brightness transitions, this will fix
   */
  aggressive?: {
    /**
     * default: `true` (controlled by config)
     */
    enabled?: boolean;
  };
  /**
   * Human understandable description of this scene (long form)
   */
  description?: string;
  /**
   * Human understandable description of this scene (short form)
   */
  friendly_name?: string;
};
