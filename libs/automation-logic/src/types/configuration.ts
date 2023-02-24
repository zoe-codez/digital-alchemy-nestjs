export type AutomationLogicModuleConfiguration = {
  global_scenes?: Record<string, RoomScene>;
  room_configuration?: Record<string, RoomConfiguration>;
};
export type RoomConfiguration = {
  local_scenes?: Record<string, RoomScene>;
  name?: string;
};
export type RoomScene = {
  friendly_name?: string;
};
