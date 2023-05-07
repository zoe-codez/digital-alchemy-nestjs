import { Injectable } from "@nestjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { gunzipSync, gzipSync } from "zlib";

import { AutoLogService } from "./auto-log.service";

const BASE = "base64";

@Injectable()
export class CompressionService {
  constructor(private readonly logger: AutoLogService) {}

  public serialize(data: object): string {
    return gzipSync(Buffer.from(JSON.stringify(data), "utf8")).toString(BASE);
  }

  public unserialize<TYPE extends object = object>(
    data: string,
    cast?: ClassConstructor<TYPE>,
  ): TYPE {
    try {
      let out;
      if (cast) {
        out = JSON.parse(gunzipSync(Buffer.from(data, BASE)).toString());
        return plainToInstance(cast, out);
      }
      return out;
    } catch (error) {
      this.logger.error({ error });
      return undefined;
    }
  }
}
