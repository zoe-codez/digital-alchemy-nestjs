import { SceneRoom } from "@steggy/automation-logic";

@SceneRoom({
  name: "bedroom",
  scenes: {
    dimmed: {
      "light.bedroom_fan": { brightness: 75, state: "on" },
      "switch.bedroom_lamp": { state: "on" },
    },
    high: {
      "light.bedroom_fan": { brightness: 255, state: "on" },
      "switch.bedroom_lamp": { state: "on" },
    },
    off: {
      "light.bedroom_fan": { state: "off" },
      "switch.bedroom_lamp": { state: "off" },
    },
  },
})
export class Bedroom {}
