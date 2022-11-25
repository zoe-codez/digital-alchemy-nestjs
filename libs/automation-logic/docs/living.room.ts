// @ts-expect-error These files don't exist in this repo, for example purposes only
import { GLOBAL_SCENES, RoomNames } from "@ineffable/network3";
import {
  SCENE_CHANGE,
  SceneRoom,
  SceneRoomService,
  SequenceWatcher,
} from "@steggy/automation-logic";
import { OnEvent } from "@steggy/boilerplate";
import { iCallService, InjectProxy } from "@steggy/home-assistant";
import { INVERT_VALUE } from "@steggy/utilities";

// @ts-expect-error These files don't exist in this repo, for example purposes only
import { OFFICE_TO_SLEEP } from "../types";

type RoomScenes = "dimmed";
type LocalScenes = GLOBAL_SCENES | RoomScenes;
const wall = "sensor.living_pico";

@SceneRoom<LocalScenes, RoomNames>({
  name: "living",
  scenes: {
    auto: {
      "light.living_room_fan": { brightness: 100, state: "on" },
      "light.tower_left": { brightness: 200, state: "on" },
      "light.tower_right": { brightness: 200, state: "on" },
      "switch.living_room_accessories": { state: "on" },
    },
    dimmed: {
      "light.living_room_fan": { brightness: 100, state: "on" },
      "light.tower_left": { brightness: 200, state: "on" },
      "light.tower_right": { brightness: 200, state: "on" },
      "switch.living_room_accessories": { state: "on" },
    },
    high: {
      "light.living_room_fan": { brightness: 255, state: "on" },
      "light.tower_left": { brightness: 255, state: "on" },
      "light.tower_right": { brightness: 255, state: "on" },
      "switch.living_room_accessories": { state: "on" },
    },
    off: {
      "light.living_room_fan": { state: "off" },
      "light.tower_left": { state: "off" },
      "light.tower_right": { state: "off" },
      "switch.living_room_accessories": { state: "off" },
    },
  },
})
export class LivingRoom {
  constructor(
    @InjectProxy()
    private readonly call: iCallService,
    public readonly scene: SceneRoomService<
      RoomScenes,
      GLOBAL_SCENES,
      RoomNames
    >,
  ) {
    scene.load("living", this);
  }

  @SequenceWatcher({
    match: ["dimDown"],
    sensor: wall,
  })
  public async dimDown(): Promise<void> {
    await this.scene.lightDim(INVERT_VALUE);
  }

  @SequenceWatcher({
    match: ["dimUp"],
    sensor: wall,
  })
  public async dimUp(): Promise<void> {
    await this.scene.lightDim();
  }

  @SequenceWatcher({
    match: ["off", "off"],
    sensor: wall,
  })
  protected async globalOff(): Promise<void> {
    await this.scene.global("off");
  }

  @SequenceWatcher({
    match: ["high", "high"],
    sensor: wall,
  })
  protected async globalOn(): Promise<void> {
    await this.scene.global("high");
  }

  @OnEvent(SCENE_CHANGE<RoomNames>("living"))
  protected async sceneChange(scene: LocalScenes): Promise<void> {
    if (scene === "off") {
      await this.call.media_player.turn_off({
        entity_id: "media_player.living_room",
      });
    }
  }

  @SequenceWatcher({
    match: ["favorite", "favorite"],
    sensor: wall,
  })
  protected async setAuto(): Promise<void> {
    await this.scene.set("auto");
  }

  @SequenceWatcher({
    match: ["high"],
    sensor: wall,
  })
  protected async setHigh(): Promise<void> {
    await this.scene.set("high");
  }

  @SequenceWatcher({
    match: ["off"],
    sensor: wall,
  })
  @OnEvent(OFFICE_TO_SLEEP)
  protected async setOff(): Promise<void> {
    await this.scene.set("off");
  }
}
