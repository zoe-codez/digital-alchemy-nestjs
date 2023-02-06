import { Injectable } from "@nestjs/common";
import { FetchService, InjectConfig } from "@steggy/boilerplate";
import { FetchArguments } from "@steggy/utilities";

import { PI_MATRIX_BASE_URL, PI_MATRIX_KEY } from "../config";
import { BorderSpinQueue, GenericWidgetDTO, PulseLaserOptions } from "../contracts";

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

  public async fetch<VALUE>(fetchWith: Omit<FetchArguments, "baseUrl">): Promise<VALUE> {
    return await this.fetchService.fetch({
      ...fetchWith,
      baseUrl: this.baseUrl,
      headers: { "x-admin-key": this.key },
    });
  }

  public async setWidgets(dash: GenericWidgetDTO[]): Promise<void> {
    return await this.fetch({
      body: { dash },
      method: "post",
      url: `/matrix/widgets`,
    });
  }
}
