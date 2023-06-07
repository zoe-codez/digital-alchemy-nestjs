import { FetchWith } from "@digital-alchemy/utilities";
import { Injectable } from "@nestjs/common";

import {
  ALL_GENERATED_SERVICE_DOMAINS,
  PICK_GENERATED_ENTITY,
  Template,
  TemplateYaml,
} from "../types";

export const PUSH_DOMAIN_CONFIG = Symbol.for("PUSH_DOMAIN");

export interface PushDomainOptions {
  domain: ALL_GENERATED_SERVICE_DOMAINS;
}

export function PushDomain(options: PushDomainOptions): ClassDecorator {
  return function (target) {
    target[PUSH_DOMAIN_CONFIG] = options;
    return Injectable()(target);
  };
}

export type CreateYamlOptions<DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> = {
  availability: Template;
  entity_id: PICK_GENERATED_ENTITY<DOMAIN>;
};

export interface iPushDomain<DOMAIN extends ALL_GENERATED_SERVICE_DOMAINS> {
  createYaml: (options: CreateYamlOptions<DOMAIN>) => TemplateYaml[];
  restCommands?: () => Record<string, FetchWith>;
  setEntityValue?: (
    entity: PICK_GENERATED_ENTITY<DOMAIN>,
    data: object,
  ) => Promise<void>;
}
