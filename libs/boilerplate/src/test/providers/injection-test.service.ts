import { Injectable } from "@nestjs/common";

import { InjectConfig } from "../../decorators";

@Injectable()
export class InjectionTestService {
  constructor(@InjectConfig("FOO") public readonly string) {}
}
