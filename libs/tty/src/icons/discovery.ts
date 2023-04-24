import { CustomIcons } from "./custom-icons";
import { DevIcons } from "./dev-icons";
import { FontAwesomeIcons } from "./fa-icons";
import { FontAwesomeExtendedIcons } from "./fae-icons";
import { LinuxIcons } from "./linux-icons";
import { MDIIcons } from "./mdi-icons";
import { MiscIcons } from "./misc-icons";
import { OctIcons } from "./oct-icons";
import { PlIcons } from "./pl-icons";
import { PomIcons } from "./pom-icons";
import { SetIcons } from "./set-icons";
import { WeatherIcons } from "./weather-icons";

export const TTYIcons = {
  custom: CustomIcons,
  dev: DevIcons,
  font_awesome: FontAwesomeIcons,
  font_awesome_extended: FontAwesomeExtendedIcons,
  linux: LinuxIcons,
  mdi: MDIIcons,
  misc: MiscIcons,
  oct: OctIcons,
  pl: PlIcons,
  pom: PomIcons,
  set: SetIcons,
  weather: WeatherIcons,
} as const;
