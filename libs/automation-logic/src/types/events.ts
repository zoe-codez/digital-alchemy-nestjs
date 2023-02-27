export const LOCATION_UPDATED = "LOCATION_UPDATED";

export const SCENE_CHANGE = <T extends string = string>(room: T) =>
  `SCENE_CHANGE:${room}`;
export const REGISTER_ROOM = "REGISTER_ROOM";
export const SCENE_SET_ENTITY = "SCENE_SET_ENTITY";
export const ANIMATION_INTERRUPT = "ANIMATION_INTERRUPT";
