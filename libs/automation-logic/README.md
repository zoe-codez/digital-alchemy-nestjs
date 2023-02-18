# @steggy/automation-logic

## Description

This library is intended to interact with `@steggy/home-assistant`, but this library attempts to provide some more opinionated logic and automation related tools.
The primary functionality of this library is wrapped up in the idea of **scene rooms**.
These are these are special providers that are intended to represent their real world counterparts, containing the logic directly related to them.

## Exported Annotations

### `@SceneRoom`

Replacement for the `@Injectable` annotation that normally is applied to providers.
This annotation will register the provider, along with some metadata, as a "room" w/ `SceneRoomService`.

> [Example room](./docs/living.room.ts)

### `@SequenceWatcher`

This annotation will watch for a specific series of state changes being emitted from an entity before activating.
In order to activate, the declared states must appear within 1500ms of the previous one to be considered a valid sequence.
If the entire sequence is matched, then the annotation will trigger the function.

The intended use case is to watch a sensor that is reporting human interactions as state changes (btn1, bt2, on, off, etc).
Many watchers for the same sensor can be set up, and complex interactions can be created.

### `@QuickAction`

Binding annotation for `QuickActionService`.

### `@SolarEvent`

Run methods based on the position of the sun (dawn / dusk / solar noon / etc).

### `@TransitionInterceptor`

Only works from within providers annoated with `@SceneRoom`.
This annotation can be used to intercept a transition from one scene to another, and manipulate the way it works.

Manipulations can take the form of changing the target transition scene, and long async actions such as a gradual light dimming.
Some canned transitions can be provided from within the metadata info for the `@SceneRoom`

## Exported Providers

### CircadianService

This provider will manage the current light temperature, emitting updates once per minute.

### SceneRoomService

Manipulate lights and other scene capable entities.
Interacts with the circadian lighting system to automatically manage lighting colors, and provides event hooks for injecting logic into scene sets.

### SolarCalcService

Provides solar math logic to identify when certain events (dawn/dusk/etc) occur.
Math based on lat/long provided by Home Assistant.
