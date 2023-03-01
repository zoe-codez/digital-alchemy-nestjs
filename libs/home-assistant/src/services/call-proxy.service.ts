import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ALL_NEST_LIFECYCLE_EVENTS, AutoLogService } from "@steggy/boilerplate";

import { ALL_DOMAINS, HASSIO_WS_COMMAND, HassServiceDTO } from "../types";
import { HassFetchAPIService } from "./hass-fetch-api.service";
import { HassSocketAPIService } from "./hass-socket-api.service";
import { SocketManagerService } from "./socket-manager.service";

let services: HassServiceDTO[];
let domains: string[];

type CallProxy = Record<
  ALL_DOMAINS,
  Record<string, (...arguments_) => Promise<void>>
>;
const DEF_NOT_DOMAINS = new Set([
  "then",
  "constructor",
  ...ALL_NEST_LIFECYCLE_EVENTS,
]);

/**
 * This class builds a proxy object, intended to pass through requests to the Home Assistant service api
 *
 * It is a bit noisy during startup, but otherwise does no work unless explicitly used.
 * To prevent building (and startup noise), set `BUILD_PROXY` on `SocketManagerService` to false.
 *
 * ## Operation
 *
 * This class builds proxy objects to be the counterpart of `InjectCallProxy`, which assembles provider wrappers around these proxies.
 *
 * ### Service availability
 *
 * Services are loaded `onModuleInit`, and are available for use `onApplicationBootstrap`
 *
 * If attempting to call services while the socket is disconnected, requests will be routed through the Home Assistant rest api.
 * This can make the socket a soft dependency and resolve some race conditions
 *
 */
@Injectable()
export class CallProxyService {
  constructor(
    private readonly logger: AutoLogService,
    private readonly fetchApi: HassFetchAPIService,
    @Inject(forwardRef(() => HassSocketAPIService))
    private readonly socketApi: HassSocketAPIService,
    private readonly manager: SocketManagerService,
  ) {}

  public buildCallProxy(): CallProxy {
    return new Proxy(
      {},
      { get: (t, domain: ALL_DOMAINS) => this.getDomain(domain) },
    );
  }

  /**
   * Describe the current services, and build up a proxy api based on that.
   *
   * This API matches the api at the time the this function is run, which may be different from any generated typescript definitions from the past.
   */
  protected async onModuleInit() {
    if (!this.manager.BUILD_PROXY) {
      this.logger.debug(`[Proxy API] skipping`);
      return;
    }
    this.logger.info(`Fetching service list`);
    services = await this.fetchApi.listServices();
    domains = services.map(i => i.domain);
    services.forEach(value => {
      this.logger.info(`[%s] scanning`, value.domain);
      Object.entries(value.services).forEach(([serviceName]) =>
        this.logger.debug(` - {%s}`, serviceName),
      );
    });
  }

  private getDomain(domain: ALL_DOMAINS) {
    if (DEF_NOT_DOMAINS.has(domain)) {
      return undefined;
    }
    if (!domains || !domains?.includes(domain)) {
      this.logger.error(`[%s] unknown domain`, domain);
      return undefined;
    }
    const domainItem: HassServiceDTO = services.find(i => i.domain === domain);
    if (!domainItem) {
      throw new InternalServerErrorException(
        `Cannot access call_service#${domain}. Home Assistant doesn't list it as a real domain.`,
      );
    }
    return Object.fromEntries(
      Object.entries(domainItem.services).map(([key]) => [
        key,
        async (parameters: object) =>
          await this.sendMessage(domain, key, parameters),
      ]),
    );
  }

  /**
   * Prefer sending via socket, if available.
   */
  private async sendMessage(
    domain: ALL_DOMAINS,
    service: string,
    service_data: object,
  ) {
    if (!this.socketApi.CONNECTION_ACTIVE) {
      return await this.fetchApi.callService(domain, service, service_data);
    }
    // User can just not await this call if they don't care about the "waitForChange"
    return await this.socketApi.sendMessage(
      {
        domain,
        service,
        service_data,
        type: HASSIO_WS_COMMAND.call_service,
      },
      true,
    );
  }
}
