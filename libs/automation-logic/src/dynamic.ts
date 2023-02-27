import { AutomationLogicModuleConfiguration } from "./types";

// Not actually dynamic yet, but potentially will be in the future
export const MODULE_CONFIGURATION = {
  global_scenes: {
    high: true,
    off: true,
  },
  room_configuration: {
    bedroom: {
      name: "Bedroom",
      scenes: {
        dimmed: { friendly_name: "Dimmed" },
        high: { friendly_name: "On" },
        off: { friendly_name: "Off" },
      },
    },
    loft: {
      name: "Loft",
      scenes: {
        high: { friendly_name: "On" },
        off: { friendly_name: "Off" },
      },
    },
    office: {
      name: "Office",
      scenes: {
        auto: {
          description: "General purpose slightly dimmed light",
          friendly_name: "Auto",
        },
        evening: {
          description:
            "Campfire dim. Schedule controlled when attempting to use auto",
          friendly_name: "Evening",
        },
        high: {
          description: "Get bright",
          friendly_name: "On",
        },
        intermediate_dim: {
          description:
            "Intermediate step between auto and evening. Redirected to based on time",
          friendly_name: "Intermediate Dim",
        },
        off: {
          description: "Turn off all the lights",
          friendly_name: "Off",
        },
      },
    },
  },
};
export const VERIFY: AutomationLogicModuleConfiguration = MODULE_CONFIGURATION;

// export const MODULE_CONFIGURATION: AutomationLogicModuleConfiguration = {};
