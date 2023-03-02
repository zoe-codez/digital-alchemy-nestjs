import { SequenceWatcher } from "@steggy/automation-logic";

type PicoEvent = {
  action: "press" | "release";
  area_name: string;
  button_number: number;
  button_type: "off";
  device_id: string;
  device_name: string;
  leap_button_number: number;
  serial: number;
  type: string;
};

export enum PicoIds {
  bedroom = "82149d66f4d9ea8533d24e50a772c422",
}

export enum Buttons {
  lower = "lower",
  stop = "stop",
  on = "on",
  off = "off",
  raise = "raise",
}

export function LutronPicoSequenceMatcher(target_device: PicoIds) {
  return function (match: `${Buttons}`[]) {
    return SequenceWatcher({
      // eslint-disable-next-line spellcheck/spell-checker
      event_type: "lutron_caseta_button_event",
      filter: ({ action, device_id }: PicoEvent) =>
        action === "press" && device_id === target_device,
      match,
      path: "button_type",
    });
  };
}
