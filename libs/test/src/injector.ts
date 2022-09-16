import { InjectionToken, Provider } from "@nestjs/common";
import { NestContainer } from "@nestjs/core";
import { STATIC_CONTEXT } from "@nestjs/core/injector/constants";
import {
  Injector,
  InjectorDependencyContext,
} from "@nestjs/core/injector/injector";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { Module } from "@nestjs/core/injector/module";

import { MockFactory } from "./interfaces";

export class TestingInjector extends Injector {
  protected container: NestContainer;
  protected mocker?: MockFactory;

  public async resolveComponentInstance<T>(
    moduleRef: Module,
    name: unknown,
    dependencyContext: InjectorDependencyContext,
    wrapper: InstanceWrapper<T>,
    contextId = STATIC_CONTEXT,
    inquirer?: InstanceWrapper,
    keyOrIndex?: string | number,
  ): Promise<InstanceWrapper> {
    try {
      const existingProviderWrapper = await super.resolveComponentInstance(
        moduleRef,
        name as InjectionToken,
        dependencyContext,
        wrapper,
        contextId,
        inquirer,
        keyOrIndex,
      );
      return existingProviderWrapper;
    } catch (error) {
      if (this.mocker) {
        const mockedInstance = this.mocker(name as InjectionToken);
        if (!mockedInstance) {
          throw error;
        }
        const newWrapper = new InstanceWrapper({
          host: moduleRef,
          instance: mockedInstance,
          isAlias: false,
          isResolved: true,
          metatype: wrapper.metatype,
          name,
          scope: wrapper.scope,
        });
        const internalCoreModule = this.container.getInternalCoreModuleRef();
        internalCoreModule.addCustomProvider(
          {
            provide: name as InjectionToken,
            useValue: mockedInstance,
          },
          internalCoreModule.providers,
        );
        internalCoreModule.addExportedProvider(name as Provider);
        return newWrapper;
      } else {
        throw error;
      }
    }
  }
  public setContainer(container: NestContainer) {
    this.container = container;
  }

  public setMocker(mocker: MockFactory) {
    this.mocker = mocker;
  }
}
