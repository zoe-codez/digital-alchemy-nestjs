import { Injectable } from "@nestjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { gunzipSync, gzipSync } from "zlib";

@Injectable()
export class CompressionService {
  serialize(data: object): string {
    return gzipSync(Buffer.from(JSON.stringify(data), "utf8")).toString(
      "base64",
    );
  }

  unserialize<TYPE extends object = object>(
    /** Raw text to unserialize */
    data: string,
    /**
     * Annotated class for class-transformer to cast to.
     * Can be used for object validation (don't trust data!)
     * */
    cast?: ClassConstructor<TYPE>,
  ): TYPE {
    try {
      const out = JSON.parse(
        gunzipSync(Buffer.from(data, "base64")).toString(),
      );
      if (cast) {
        return plainToInstance(cast, out);
      }
      return out;
    } catch {
      return undefined;
    }
  }
}
