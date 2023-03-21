import { AutoLogService } from "@digital-alchemy/boilerplate";
import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationService {
  constructor(private readonly logger: AutoLogService) {}
}
