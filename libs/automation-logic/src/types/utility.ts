import { Get } from "type-fest";

import { MODULE_CONFIGURATION } from "../dynamic";

export type ALL_GLOBAL_SCENES = keyof typeof MODULE_CONFIGURATION.global_scenes;
export type ALL_ROOM_NAMES =
  keyof typeof MODULE_CONFIGURATION.room_configuration;

export type RoomConfiguration<ROOM extends ALL_ROOM_NAMES> =
  (typeof MODULE_CONFIGURATION.room_configuration)[ROOM];

export type PICK_ROOM<ROOM extends ALL_ROOM_NAMES> = RoomConfiguration<ROOM>;
export type ROOM_SCENES<ROOM extends ALL_ROOM_NAMES> = Extract<
  keyof Get<PICK_ROOM<ROOM>, "local_scenes">,
  string
>;

// TESTING

const list: ROOM_SCENES<"office">[] = [];
list.push("auto");
console.log(list);
