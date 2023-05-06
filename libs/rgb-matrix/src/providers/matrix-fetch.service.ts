import { FetchService, InjectConfig } from "@digital-alchemy/boilerplate";
import { FetchArguments, is } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import { PI_MATRIX_BASE_URL, PI_MATRIX_KEY } from "../config";
import {
  APlaySpeakerDevice,
  BorderSpinQueue,
  FONTS,
  GenericWidgetDTO,
  MatrixDimensionsResponse,
  PulseLaserOptions,
  RGB,
  SetPixelGrid,
  SoundConfiguration,
} from "../types";

@Injectable()
export class MatrixFetch {
  constructor(
    @InjectConfig(PI_MATRIX_BASE_URL)
    private readonly baseUrl: string,
    @InjectConfig(PI_MATRIX_KEY)
    private readonly key: string,
    private readonly fetchService: FetchService,
  ) {}

  public async animateBorderSpinQueue(body: BorderSpinQueue): Promise<void> {
    return await this.fetch({
      body,
      method: "post",
      url: "/animation/spin-queue",
    });
  }

  public async animatePulseLaser(body: PulseLaserOptions): Promise<void> {
    return await this.fetch({
      body,
      method: "post",
      url: "/animation/pulse-laser",
    });
  }

  public async exists(): Promise<boolean> {
    try {
      await this.getDimensions();
      return true;
    } catch {
      return false;
    }
  }

  public async fetch<VALUE>(
    fetchWith: Omit<FetchArguments, "baseUrl">,
  ): Promise<VALUE> {
    return await this.fetchService.fetch({
      ...fetchWith,
      baseUrl: this.baseUrl,
      headers: { "x-admin-key": this.key },
    });
  }

  public async getCurrentWidgets(): Promise<GenericWidgetDTO[]> {
    return await this.fetch({
      url: `/widget`,
    });
  }

  public async getDimensions(): Promise<MatrixDimensionsResponse> {
    return await this.fetch({
      url: `/matrix/dimensions`,
    });
  }

  public async getSoundConfiguration(): Promise<SoundConfiguration> {
    return await this.fetch({
      url: `/sound/configuration`,
    });
  }

  public async listAvailableFonts(): Promise<FONTS[]> {
    return await this.fetch({
      url: `/widget/fonts`,
    });
  }

  public async listAvailableSoundDevices(): Promise<APlaySpeakerDevice[]> {
    return await this.fetch({
      url: `/sound/devices`,
    });
  }
  public async setPixels(body: SetPixelGrid): Promise<void> {
    return await this.fetch({
      body,
      method: "post",
      url: `/pixel`,
    });
  }

  public async setWidgets(dash: GenericWidgetDTO[]): Promise<void> {
    return await this.fetch({
      body: { dash },
      method: "post",
      url: `/widget`,
    });
  }
}
