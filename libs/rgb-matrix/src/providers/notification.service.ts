import { Injectable } from "@nestjs/common";
import { AutoLogService } from "@digital-alchemy/boilerplate";

@Injectable()
export class NotificationService {
  constructor(private readonly logger: AutoLogService) {}
}
