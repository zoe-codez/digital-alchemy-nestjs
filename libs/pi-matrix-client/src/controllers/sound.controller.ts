import {
  APlaySpeakerDevice,
  PlaySoundCommand,
  SoundConfiguration,
} from "@digital-alchemy/rgb-matrix";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Get, Post } from "@nestjs/common";

import { SoundService } from "../services";

@Controller("/sound")
@AuthStack()
export class SoundController {
  constructor(private readonly sound: SoundService) {}

  @Post("/play")
  public async playSound(
    @Body() body: PlaySoundCommand,
  ): Promise<typeof GENERIC_SUCCESS_RESPONSE> {
    await this.sound.playSound(body);
    return GENERIC_SUCCESS_RESPONSE;
  }

  @Get("/configuration")
  public soundConfiguration(): SoundConfiguration {
    return this.sound.describeConfiguration();
  }

  @Get("/devices")
  public async speakerDeviceList(): Promise<APlaySpeakerDevice[]> {
    return await this.sound.speakerDeviceList();
  }
}
