import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@steggy/boilerplate";

@Injectable()
export class NotificationService {
  constructor(private readonly logger: AutoLogService) {}
}
