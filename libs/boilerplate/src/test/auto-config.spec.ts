import { Test } from "@steggy/testing";
import { argv, env } from "process";

import {
  CACHE_HOST,
  CACHE_PORT,
  CACHE_PROVIDER,
  CACHE_TTL,
  CONFIG,
  LIB_BOILERPLATE,
  LOG_LEVEL,
  SCAN_CONFIG,
} from "../config";
import { SKIP_CONFIG_INIT } from "../contracts";
import { AutoConfigService } from "../services";
import { CollisionAModule, CollisionBModule } from "./modules";
import { InjectionInlineTest, InjectionModuleTest } from "./services";
import { COLLISION_LIBRARY, TEST_CONFIG_A, TEST_CONFIG_B } from "./types";

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
      expect(configService.get([LIB_BOILERPLATE, CACHE_HOST])).toBe(
        "localhost",
      );
      expect(configService.get([LIB_BOILERPLATE, CACHE_PORT])).toBe(6379);
      expect(configService.get([LIB_BOILERPLATE, SCAN_CONFIG])).toBe(false);
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

  describe("Value Priority Resolution", () => {
    beforeEach(() => {
      delete env.STRING_CONFIG;
      delete env.string_config;
      AutoConfigService.setSwitches(argv);
    });

    it("respects inline configuration defaults", async () => {
      const app = await Test.createTestingModule({
        providers: [InjectionInlineTest],
      }).compile();
      const service = app.get(InjectionInlineTest);
      expect(service.string).toBe("default_value");
      expect(service.number).toBe(50);
      expect(service.boolean).toBe(true);
      expect(service.string_no_default).toBe("class_defined_default");
      expect(service.string_array).toStrictEqual(["string"]);
      expect(service.record).toStrictEqual({ hello: "world" });
    });

    it("respects module configuration defaults", async () => {
      const app = await Test.createTestingModule({
        application: Symbol("auto-config-test-no-file"),
        configuration: {
          BOOLEAN_CONFIG: { default: true, type: "boolean" },
          NUMBER_CONFIG: { default: 50, type: "number" },
          RECORD: {
            default: { hello: "world" },
            type: "record",
          },
          STRING_ARRAY: {
            default: ["string"],
            type: "string[]",
          },
          STRING_CONFIG: {
            default: "default_value",
            type: "string",
          },
          STRING_CONFIG_NO_DEFAULT: { type: "string" },
        },
        providers: [InjectionModuleTest],
      }).compile();
      const service = app.get(InjectionModuleTest);
      expect(service.string).toBe("default_value");
      expect(service.number).toBe(50);
      expect(service.boolean).toBe(true);
      expect(service.string_no_default).toBe("class_defined_default");
      expect(service.string_array).toStrictEqual(["string"]);
      expect(service.record).toStrictEqual({ hello: "world" });
    });

    it("lets bootstrap values override module", async () => {
      const app = await Test.createTestingModule({
        application: Symbol("auto-config-test-no-file"),
        bootstrap: {
          config: {
            application: {
              BOOLEAN_CONFIG: false,
              NUMBER_CONFIG: 75,
              RECORD: { dance: "off" },
              STRING_ARRAY: ["upside", "down"],
              STRING_CONFIG: "override value",
              STRING_CONFIG_NO_DEFAULT: "maybe it does",
            },
          },
        },
        configuration: {
          BOOLEAN_CONFIG: { default: true, type: "boolean" },
          NUMBER_CONFIG: { default: 50, type: "number" },
          RECORD: {
            default: { hello: "world" },
            type: "record",
          },
          STRING_ARRAY: {
            default: ["string"],
            type: "string[]",
          },
          STRING_CONFIG: {
            default: "default_value",
            type: "string",
          },
          STRING_CONFIG_NO_DEFAULT: { type: "string" },
        },
        providers: [InjectionModuleTest],
      }).compile();
      const service = app.get(InjectionModuleTest);
      expect(service.string).toBe("override value");
      expect(service.number).toBe(75);
      expect(service.boolean).toBe(false);
      expect(service.string_no_default).toBe("maybe it does");
      expect(service.string_array).toStrictEqual(["upside", "down"]);
      expect(service.record).toStrictEqual(
        expect.objectContaining({ dance: "off" }),
      );
    });

    it("prioritizes file configurations over code definitions", async () => {
      // eslint-disable-next-line spellcheck/spell-checker
      // ! This test is intended to load values from the .auto-config-testrc file
      const app = await Test.createTestingModule({
        application: Symbol("auto-config-test"),
        bootstrap: {
          config: {
            application: {
              STRING_CONFIG: "override value",
            },
          },
        },
        configuration: {
          STRING_CONFIG: {
            default: "default_value",
            type: "string",
          },
        },
        providers: [InjectionModuleTest],
      }).compile();
      const service = app.get(InjectionModuleTest);
      expect(service.string).toBe("from rc file");
    });

    it("prioritizes environment variables over file configurations", async () => {
      env.STRING_CONFIG = "environment string";
      const app = await Test.createTestingModule({
        application: Symbol("auto-config-test"),
        bootstrap: {
          config: {
            application: {
              STRING_CONFIG: "override value",
            },
          },
        },
        configuration: {
          STRING_CONFIG: {
            default: "default_value",
            type: "string",
          },
        },
        providers: [InjectionModuleTest],
      }).compile();
      const service = app.get(InjectionModuleTest);
      expect(service.string).toBe("environment string");
    });

    it("prioritizes environment variables over file configurations with inline definitions", async () => {
      env.STRING_CONFIG = "environment string";
      const app = await Test.createTestingModule({
        application: Symbol("auto-config-test"),
        bootstrap: {
          config: {
            application: {
              STRING_CONFIG: "override value",
            },
          },
        },
        configuration: {
          STRING_CONFIG: {
            default: "default_value",
            type: "string",
          },
        },
        providers: [InjectionInlineTest],
      }).compile();
      const service = app.get(InjectionInlineTest);
      expect(service.string).toBe("environment string");
    });

    it("prioritizes environment variables over file configurations with different formatting", async () => {
      env.string_config = "environment string";
      const app = await Test.createTestingModule({
        application: Symbol("auto-config-test"),
        bootstrap: {
          config: {
            application: {
              STRING_CONFIG: "override value",
            },
          },
        },
        configuration: {
          STRING_CONFIG: {
            default: "default_value",
            type: "string",
          },
        },
        providers: [InjectionModuleTest],
      }).compile();
      const service = app.get(InjectionModuleTest);
      expect(service.string).toBe("environment string");
    });

    it("prioritizes switches over environment variables", async () => {
      env.STRING_CONFIG = "environment string";
      AutoConfigService.setSwitches(["--STRING_CONFIG", "switch config"]);
      const app = await Test.createTestingModule({
        application: Symbol("auto-config-test"),
        bootstrap: {
          config: {
            application: { STRING_CONFIG: "override value" },
          },
        },
        configuration: {
          STRING_CONFIG: {
            default: "default_value",
            type: "string",
          },
        },
        providers: [InjectionModuleTest],
      }).compile();
      const service = app.get(InjectionModuleTest);
      expect(service.string).toBe("switch config");
    });
  });

  describe("Edge Cases", () => {
    describe("Do not include configurations from unloaded modules", () => {
      it("module a", async () => {
        const app = await Test.createTestingModule({
          bootstrap: {
            config: {
              application: { foo: true },
              libs: { boilerplate: { LOG_LEVEL: "debug" } },
            },
          },
          imports: [CollisionAModule],
        }).compile();
        const configService = app.get<AutoConfigService>(AutoConfigService);

        expect(configService.get([COLLISION_LIBRARY, TEST_CONFIG_A])).toBe(
          TEST_CONFIG_A,
        );
        expect(
          configService.get([COLLISION_LIBRARY, TEST_CONFIG_B]),
        ).toBeUndefined();
      });
      it("module b", async () => {
        const app = await Test.createTestingModule({
          bootstrap: {
            config: {
              application: { foo: true },
              libs: { boilerplate: { LOG_LEVEL: "debug" } },
            },
          },
          imports: [CollisionBModule],
        }).compile();
        const configService = app.get<AutoConfigService>(AutoConfigService);

        expect(configService.get([COLLISION_LIBRARY, TEST_CONFIG_B])).toBe(
          TEST_CONFIG_B,
        );
        expect(
          configService.get([COLLISION_LIBRARY, TEST_CONFIG_A]),
        ).toBeUndefined();
      });
    });
  });
});
