import { Injectable } from "@nestjs/common";
import { AutoLogService, ModuleScannerService } from "@steggy/boilerplate";

import { SCENE_ROOM_OPTIONS } from "../types";

@Injectable()
export class ScannerService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly scanner: ModuleScannerService,
  ) {}

  public build() {
    const out = new Map();
    const list = this.scanner.findWithSymbol(SCENE_ROOM_OPTIONS);
    list.forEach((item: { name: string }) => out.set(item.name, item));
    return out;
  }
}
