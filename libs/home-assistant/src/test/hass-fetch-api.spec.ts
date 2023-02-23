import { faker } from "@faker-js/faker";
import { Test } from "@steggy/testing";
import { DEFAULT_LIMIT } from "@steggy/utilities";
import dayjs from "dayjs";

import { BASE_URL, TOKEN } from "../config";
import { HomeAssistantModule } from "../modules";
import { HassFetchAPIService } from "../services";

describe("Hass Fetch API", () => {
  let fetch: HassFetchAPIService;
  const base = faker.internet.url();
  const token = faker.random.words(DEFAULT_LIMIT);
  const fetchSpy = jest.fn();
  const entity_id = "sensor.test";

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      bootstrap: {
        config: {
          libs: {
            "home-assistant": {
              [BASE_URL]: base,
              [TOKEN]: token,
            },
          },
        },
      },
      imports: [HomeAssistantModule],
    }).compile();
    await app.init();
    fetch = app.get(HassFetchAPIService);
    // Prevent any real outgoing http calls
    fetch["fetchService"]["fetch"] = fetchSpy;
  });

  it("Will set the base url from configuration", () => {
    expect(fetch).toBeDefined();
    expect(fetch["fetchService"].BASE_URL).toBe(base);
  });

  it("Will authorization headers", async () => {
    await fetch.fetch({ url: "/test" });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  });

  it("Can check yaml config", async () => {
    await fetch.checkConfig();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: `post`,
        url: `/api/config/core/check_config`,
      }),
    );
  });

  it("Can retrieve entity history", async () => {
    const start = dayjs();
    const end = dayjs().subtract(DEFAULT_LIMIT, "weeks");
    await fetch.fetchEntityHistory(entity_id, start.toDate(), end.toDate());
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          end_time: end.toISOString(),
          filter_entity_id: entity_id,
        },
        url: `/api/history/period/${start.toISOString()}`,
      }),
    );
  });

  it("Can retrieve a list of all entities", async () => {
    await fetch.getAllEntities();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/api/states`,
      }),
    );
  });

  it("Can retrieve a list of all home assistant services", async () => {
    await fetch.listServices();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/api/services`,
      }),
    );
  });

  it("Can make changes to entity states", async () => {
    const state = faker.random.word();
    await fetch.updateEntity(entity_id, {
      state,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          state,
        },
        method: "post",
        url: `/api/states/${entity_id}`,
      }),
    );
  });
});
