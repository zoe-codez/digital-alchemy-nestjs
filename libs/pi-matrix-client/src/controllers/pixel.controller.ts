import { SetPixelGrid } from "@digital-alchemy/rgb-matrix";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Post } from "@nestjs/common";

import { PixelService } from "../services";

@Controller("/pixel")
@AuthStack()
export class PixelController {
  constructor(private readonly pixel: PixelService) {}

  @Post("/")
  public pixelGrid(
    @Body() grid: SetPixelGrid,
  ): typeof GENERIC_SUCCESS_RESPONSE {
    this.pixel.setGrid(grid);
    return GENERIC_SUCCESS_RESPONSE;
  }
}
