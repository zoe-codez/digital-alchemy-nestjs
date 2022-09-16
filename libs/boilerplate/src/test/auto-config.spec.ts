import { Test } from "@steggy/test";
import { env } from "process";

import {
  CACHE_PROVIDER,
  CACHE_TTL,
  CONFIG,
  LIB_BOILERPLATE,
  LOG_LEVEL,
  REDIS_HOST,
  REDIS_PORT,
  SCAN_CONFIG,
  VERSION,
} from "../config";
import { SKIP_CONFIG_INIT } from "../contracts";
import { AutoConfigService } from "../services";

describe("AutoConfig", () => {
  let configService: AutoConfigService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      bootstrap: {
        config: {
          application: { foo: true },
          libs: { boilerplate: { LOG_LEVEL: "debug" } },
        },
      },
    }).compile();

    configService = app.get<AutoConfigService>(AutoConfigService);
  });

  it("should exist", () => {
    expect(configService).toBeDefined();
    expect(configService.get).toBeDefined();
  });

  it("sets the log context", () => {
    expect(configService["logger"]["context"]).toBe(
      "boilerplate:AutoConfigService",
    );
  });

  describe("Information Retrieval", () => {
    it("can load values by path", () => {
      expect(configService.get("application.foo")).toBe(true);
      expect(configService.get("libs.boilerplate.LOG_LEVEL")).toBe("debug");
    });

    it("can load by symbol reference", () => {
      expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("debug");
    });

    it("loads module defaults", () => {
      expect(configService.get([LIB_BOILERPLATE, CACHE_PROVIDER])).toBe(
        "memory",
      );
      expect(configService.get([LIB_BOILERPLATE, CACHE_TTL])).toBe(86_400);
      expect(configService.get([LIB_BOILERPLATE, CONFIG])).toBe(undefined);
      expect(configService.get([LIB_BOILERPLATE, REDIS_HOST])).toBe(
        "localhost",
      );
      expect(configService.get([LIB_BOILERPLATE, REDIS_PORT])).toBe(6379);
      expect(configService.get([LIB_BOILERPLATE, SCAN_CONFIG])).toBe(false);
      expect(configService.get([LIB_BOILERPLATE, VERSION])).toBe(false);
    });

    it("can cast a boolean", () => {
      expect(configService["cast"]("true", "boolean")).toBe(true);
      expect(configService["cast"]("y", "boolean")).toBe(true);
      expect(configService["cast"]("1", "boolean")).toBe(true);
      expect(configService["cast"]("true", "boolean")).toBe(true);

      expect(configService["cast"]("false", "boolean")).toBe(false);
      expect(configService["cast"]("anything else", "boolean")).toBe(false);
    });

    it("can cast a number", () => {
      expect(configService["cast"]("1", "number")).toBe(1);
      expect(configService["cast"]("true", "number")).toBe(Number.NaN);
    });

    it("can cast a string array", () => {
      expect(configService["cast"]("1", "string[]")).toStrictEqual(["1"]);
      expect(configService["cast"](["1", "2"], "string[]")).toStrictEqual([
        "1",
        "2",
      ]);
      // @ts-expect-error I'm messing with it on purpose
      expect(configService["cast"](["1", 2], "string[]")).toStrictEqual([
        "1",
        "2",
      ]);
    });
  });

  describe("Early Init", () => {
    beforeEach(async () => {
      const app = await Test.createTestingModule({
        bootstrap: {
          config: {
            application: { foo: true },
            libs: { boilerplate: { LOG_LEVEL: "debug" } },
          },
          flags: [SKIP_CONFIG_INIT],
        },
      }).compile();
      configService = app.get<AutoConfigService>(AutoConfigService);
      delete env["LOG_LEVEL"];
      delete env["log_level"];
      delete env["log-level"];
    });

    it("loads defaults", () => {
      configService["setDefaults"] = jest.fn();
      configService["loadFromEnv"] = jest.fn();
      configService["earlyInit"]();
      expect(configService["setDefaults"]).toHaveBeenCalled();
      expect(configService["loadFromEnv"]).toHaveBeenCalled();
      expect(configService.configFiles).toStrictEqual([]);
    });

    describe("environment variable coercion", () => {
      it("pull from super simplified variable", () => {
        env["LOG_LEVEL"] = "silent";
        configService["earlyInit"]();
        expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("silent");
      });

      it("is case insensitive", () => {
        env["log_level"] = "silent";
        configService["earlyInit"]();
        expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("silent");
      });

      it("accepts dash or underscore", () => {
        env["log-level"] = "silent";
        configService["earlyInit"]();
        expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("silent");
      });

      it("can accept direct references", () => {
        env["libs_boilerplate_LOG_LEVEL"] = "silent";
        configService["earlyInit"]();
        expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("silent");
      });

      it("can accept direct references wacky style", () => {
        env["LiBs-boilerPlate-LOG-level"] = "silent";
        configService["earlyInit"]();
        expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("silent");
      });
    });

    describe("command line switch coercion", () => {
      // ? Normally pulls from `argv`, but manually overriding the values for the purpose of testing
      it("can make sense of switches", () => {
        configService["earlyInit"](["--LOG_LEVEL", "silent"]);
        expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("silent");
      });

      it("is case insensitive", () => {
        configService["earlyInit"](["--log_level", "silent"]);
        expect(configService.get([LIB_BOILERPLATE, LOG_LEVEL])).toBe("silent");
      });
    });
  });
});
