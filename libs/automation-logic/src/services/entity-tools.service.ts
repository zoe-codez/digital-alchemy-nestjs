/* eslint-disable radar/cognitive-complexity */
import { Injectable } from "@nestjs/common";
import {
  domain,
  EntityManagerService,
  PICK_ENTITY,
} from "@steggy/home-assistant";
import { is } from "@steggy/utilities";
import { SceneRoom } from "../decorators";
import { ALL_ROOM_NAMES } from "../types";

import { SceneRoomService } from "./scene-room.service";

interface CircadianTestOptions {
  allowOff?: boolean;
  room?: ALL_ROOM_NAMES;
}

@Injectable()
export class EntityToolsService {
  constructor(private readonly entity: EntityManagerService) {}

  /**
   * Should circadian if:
   *  - auto circadian is not disabled
   *  - is a light, that is currently on
   *  - the light was recently turned off (<5s)
   *  -
   */
  public shouldCircadian(
    entity_id: PICK_ENTITY<"light">,
    { room, allowOff }: CircadianTestOptions = {},
  ): boolean {
    if (domain(entity_id) !== "light") {
      return false;
    }
    if (!allowOff) {
      const entity = this.entity.byId(entity_id);
      if (entity.state === "off") {
        return false;
      }
    }
    if (is.empty(room)) {
      const result = [...SceneRoom.SCENE_ROOM_MAP.entries()].find(
        ([name, options]) => {
          const scene = SceneRoomService.RoomState(name);
          if (!is.empty(scene)) {
            return false;
          }
          const current = options.scenes[scene] ?? {};
          return !!current[entity_id];
        },
      );
      if (!result) {
        return false;
      }
      const [roomName] = result;
      room = roomName;
    }
    const scene = SceneRoomService.RoomState(room);
    const { auto_circadian, scenes } = SceneRoom.SCENE_ROOM_MAP.get(room);
    if (auto_circadian === false) {
      return false;
    }
    const currentScene = scenes[scene] ?? {};
    if (!currentScene[entity_id]) {
      return true;
    }
    return Object.keys(currentScene[entity_id]).every(i =>
      ["state", "brightness"].includes(i),
    );
  }
}
