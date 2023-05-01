import { OFF } from "@digital-alchemy/rgb-matrix";
import { AuthStack, GENERIC_SUCCESS_RESPONSE } from "@digital-alchemy/server";
import { Body, Controller, Post } from "@nestjs/common";
import { Color } from "rpi-led-matrix";

import { PixelService } from "../services";

@Controller("/pixel")
@AuthStack()
export class PixelController {
  constructor(private readonly pixel: PixelService) {}

  @Post("/")
  public pixelGrid(
    @Body() { grid, color }: { grid: string; color: Color },
  ): typeof GENERIC_SUCCESS_RESPONSE {
    const parsed = grid
      .split(`\n`)
      .map(i => [...i].map(index => index === "1"));
    this.pixel.setGrid(
      parsed.map(row =>
        row.map(cell => (cell ? color : { b: OFF, g: OFF, r: OFF })),
      ),
    );
    return GENERIC_SUCCESS_RESPONSE;
  }
}
