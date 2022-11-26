import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";

@Injectable()
export class BackupService {
  constructor(private readonly logger: AutoLogService) {}
}
