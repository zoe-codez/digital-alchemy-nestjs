import { AutomationLogicModuleConfiguration } from "./types";

// Not actually dynamic yet, but potentially will be in the future
export const MODULE_CONFIGURATION = {
  global_scenes: {
    off: {
      friendly_name: "off",
    },
    on: {
      friendly_name: "on",
    },
  },
  room_configuration: {
    office: {
      scenes: {
        off: {},
        on: {},
        auto: {
          friendly_name: "Test",
        },
      },
    },
  },
};
export const VERIFY: AutomationLogicModuleConfiguration = MODULE_CONFIGURATION;

// export const MODULE_CONFIGURATION: AutomationLogicModuleConfiguration = {};
