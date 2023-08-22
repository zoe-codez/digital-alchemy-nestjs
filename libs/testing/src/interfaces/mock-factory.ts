/* eslint-disable @typescript-eslint/no-explicit-any */
import { InjectionToken } from "@nestjs/common";

export type MockFactory = (token?: InjectionToken) => any;
