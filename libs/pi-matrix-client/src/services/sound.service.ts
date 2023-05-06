import { AutoLogService, InjectConfig } from "@digital-alchemy/boilerplate";
import {
  APlaySpeakerDevice,
  NO_SOUND_DEVICE,
  PlaySoundCommand,
  SoundConfiguration,
} from "@digital-alchemy/rgb-matrix";
import { Injectable } from "@nestjs/common";
import execa from "execa";
import { readdirSync } from "fs";
import { isAbsolute, join } from "path";

import { DEFAULT_SOUND_DEVICE, SOUND_DIRECTORY } from "../config";

@Injectable()
export class SoundService {
  constructor(
    @InjectConfig(SOUND_DIRECTORY)
    private readonly soundDirectory: string,
    @InjectConfig(DEFAULT_SOUND_DEVICE)
    private readonly soundDevice: number,
    private readonly logger: AutoLogService,
  ) {}

  public describeConfiguration(): SoundConfiguration {
    return {
      directory: this.soundDirectory,
      files: this.soundFileList(),
    };
  }

  public async playSound({
    sound,
    card = this.soundDevice,
  }: PlaySoundCommand): Promise<void> {
    sound = isAbsolute(sound) ? sound : join(this.soundDirectory, sound);
    if (card !== NO_SOUND_DEVICE) {
      this.logger.info(`[%s] playing on card {%s}`, sound, card);
      await execa("mplayer", ["-ao", `alsa:device=hw=${card}.0`, sound]);
      return;
    }
    this.logger.info(`[%s] playing on system default card`, sound);
    await execa("mplayer", [sound]);
  }

  public soundFileList(): string[] {
    return readdirSync(this.soundDirectory).filter(
      i => ![".", ".."].includes(i),
    );
  }

  public async speakerDeviceList(): Promise<APlaySpeakerDevice[]> {
    const out = await execa("aplay", ["-l"]);
    const speakers = [] as APlaySpeakerDevice[];
    out.stdout.split("\n").forEach(line => {
      if (!line.startsWith("card")) {
        return;
      }
      const [card, description, name] = line.split(":");
      const speaker = {
        card: Number(card.replace("card ", "")),
        description: description.split(",").shift(),
        name,
      };
      speakers.push(speaker);
      this.logger.debug(
        `[%s] (device {%s})`,
        speaker.description,
        speaker.card,
      );
    });

    return speakers;
  }
}

/**
 * ## Reference command for playing a sound
 *
 * ```bash
 * mplayer -ao alsa:device=hw=2.0 bell-123742.mp3
 * ```
 *
 * ## Reference output of `aplay -l` for parsing
 *
 * ```text
 * **** List of PLAYBACK Hardware Devices ****
 * card 0: Headphones [bcm2835 Headphones], device 0: bcm2835 Headphones [bcm2835 Headphones]
 *   Subdevices: 8/8
 *   Subdevice #0: subdevice #0
 *   Subdevice #1: subdevice #1
 *   Subdevice #2: subdevice #2
 *   Subdevice #3: subdevice #3
 *   Subdevice #4: subdevice #4
 *   Subdevice #5: subdevice #5
 *   Subdevice #6: subdevice #6
 *   Subdevice #7: subdevice #7
 * card 1: vc4hdmi0 [vc4-hdmi-0], device 0: MAI PCM i2s-hifi-0 [MAI PCM i2s-hifi-0]
 *   Subdevices: 1/1
 *   Subdevice #0: subdevice #0
 * card 2: UACDemoV10 [UACDemoV1.0], device 0: USB Audio [USB Audio]
 *   Subdevices: 1/1
 *   Subdevice #0: subdevice #0
 * card 3: vc4hdmi1 [vc4-hdmi-1], device 0: MAI PCM i2s-hifi-0 [MAI PCM i2s-hifi-0]
 *   Subdevices: 1/1
 *   Subdevice #0: subdevice #0
 * ```
 *
 * ### Notes
 *
 *  card 2: UACDemoV10 [UACDemoV1.0], device 0: USB Audio [USB Audio]
 * :-----^----^^^^^^^^^^^^^^^-------------------^^^^^^^^^^^^^^^^^^^^^:
 *       |       +--- description               +--- card name
 *       +--- card number
 */
