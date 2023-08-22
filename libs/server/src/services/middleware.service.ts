import {
  AutoLogService,
  BootstrapOptions,
  InjectConfig,
} from "@digital-alchemy/boilerplate";
import { INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Express, json } from "express";
import { readFileSync } from "fs";
import helmet from "helmet";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";

import {
  BODY_SIZE,
  COMPRESSION,
  CORS,
  GLOBAL_PREFIX,
  PORT,
  SSL_CERT,
  SSL_KEY,
  SSL_PORT,
} from "../config";
import { BasicExceptionFilter } from "../filters";

@Injectable()
export class MiddlewareService {
  constructor(
    private readonly logger: AutoLogService,
    @InjectConfig(GLOBAL_PREFIX)
    private readonly prefix: string,
    @InjectConfig(BODY_SIZE)
    private readonly limit: string,
    @InjectConfig(COMPRESSION)
    private readonly compression: boolean,
    @InjectConfig(PORT)
    private readonly port: number,
    @InjectConfig(SSL_PORT)
    private readonly sslPort: number,
    @InjectConfig(SSL_KEY)
    private readonly sslKey: string,
    @InjectConfig(SSL_CERT)
    private readonly sslCert: string,
    @InjectConfig(CORS) private readonly cors: string,
  ) {}

  protected onPostInit(
    app: INestApplication,
    server: Express,
    { http }: BootstrapOptions,
  ): void {
    if (this.prefix) {
      this.logger.debug(`Using global http prefix {${this.prefix}}`);
    }
    if (!http) {
      this.logger.error(`http disabled`);
      return;
    }
    app.use(helmet(), cookieParser());
    this.logger.debug(`[cookieParser], [helmet]`);
    app.useGlobalPipes(new ValidationPipe());
    app.use(json({ limit: this.limit }));
    this.logger.debug(`json size limit {%s}`, this.limit);
    if (this.cors) {
      this.logger.debug(`Using [cors] middleware`);
      app.use(cors());
    }
    if (this.compression) {
      this.logger.debug(`Using [compression] middleware`);
      app.use(compression());
    }
    const listening = this.listenHttp(server);
    if (this.sslPort) {
      this.listenSsl(server);
      return;
    }
    if (!listening) {
      this.logger.error(`No port to listen on`);
    }
  }

  protected onPreInit(app: INestApplication): void {
    const filter = app.get(BasicExceptionFilter);
    app.useGlobalFilters(filter);
    if (this.prefix) {
      app.setGlobalPrefix(this.prefix);
    }
  }

  private listenHttp(server: Express): boolean {
    if (this.port) {
      createServer(server).listen(this.port, () =>
        this.logger.info(`📡 Listening on [${this.port}] {(http)} 📡`),
      );
      return true;
    }
    return false;
  }

  private listenSsl(server: Express): void {
    const key = readFileSync(this.sslKey, "utf8");
    const cert = readFileSync(this.sslCert, "utf8");
    if (!key) {
      throw new Error(`Bad ssl key`);
    }
    if (!cert) {
      throw new Error(`Bad ssl cert`);
    }
    createHttpsServer({ cert, key }, server).listen(this.sslPort, () =>
      this.logger.info(`📡 Listening on [${this.sslPort}] {(https)} 📡`),
    );
  }
}
