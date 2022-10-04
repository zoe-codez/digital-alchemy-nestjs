import { Injectable } from "@nestjs/common";

import { InjectConfig } from "../../decorators";

@Injectable()
export class InjectionModuleTest {
  constructor(
    @InjectConfig("STRING_CONFIG")
    public readonly string: string = "SHOULD NOT EVER HAVE THIS VALUE",
    @InjectConfig("NUMBER_CONFIG")
    public readonly number: number = Number.NaN,
    @InjectConfig("BOOLEAN_CONFIG")
    public readonly boolean: boolean = false,
    @InjectConfig("STRING_CONFIG_NO_DEFAULT")
    public readonly string_no_default: string = "class_defined_default",
    @InjectConfig("STRING_ARRAY")
    public readonly string_array: string[] = ["class_defined_default"],
    @InjectConfig("RECORD")
    public readonly record: object = { foo: "bar" },
  ) {}
}

@Injectable()
export class InjectionInlineTest {
  constructor(
    @InjectConfig("STRING_CONFIG", { default: "default_value", type: "string" })
    public readonly string: string = "SHOULD NOT EVER HAVE THIS VALUE",
    @InjectConfig("NUMBER_CONFIG", { default: 50, type: "number" })
    public readonly number: number = Number.NaN,
    @InjectConfig("BOOLEAN_CONFIG", { default: true, type: "boolean" })
    public readonly boolean: boolean = false,
    @InjectConfig("STRING_CONFIG_NO_DEFAULT", { type: "string" })
    public readonly string_no_default: string = "class_defined_default",
    @InjectConfig("STRING_ARRAY", {
      default: ["string"],
      type: "string[]",
    })
    public readonly string_array: string[] = ["class_defined_default"],
    @InjectConfig("RECORD", {
      default: { hello: "world" },
      type: "record",
    })
    public readonly record: object = { foo: "bar" },
  ) {}
}
