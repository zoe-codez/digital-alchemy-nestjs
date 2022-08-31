// import { APIRequest, APIResponse } from '@steggy/server';

import { is } from "@steggy/utilities";

export const PINO_SERIALIZERS = {
  parameters(parameters: unknown[]): unknown[] {
    return parameters.map(item => {
      if (is.object(item)) {
        if (!is.undefined((item as Record<string, unknown>)["_parsedUrl"])) {
          return "APIRequest";
        }
        return item;
      }
      return item;
    });
  },
  req(request: Record<string, unknown>): unknown {
    return {
      id: request["id"],
      method: request["method"],
      url: request["url"],
    };
  },
  res(response: Record<string, unknown>): unknown {
    return {
      statusCode: response["statusCode"],
    };
  },
};
