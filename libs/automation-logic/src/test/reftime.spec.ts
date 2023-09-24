import "../includes/reftimes";

import { DAY, is } from "@digital-alchemy/utilities";
import FakeTimers from "@sinonjs/fake-timers";

describe("Time Calculation", () => {
  let clock: FakeTimers.InstalledClock;
  const am1 = new Date();
  am1.setHours(11, 0, 0, 0);

  beforeAll(() => {
    // prevent the clock from changing during the test
    // can mess up the ms precision
    clock = FakeTimers.install();
    clock.setSystemTime(am1);
  });
  afterAll(() => {
    clock.uninstall();
  });

  describe("shortTime", () => {
    it("NOW", () => {
      const timestamp = Date.now();
      const [NOW] = is.shortTime(["NOW"]);
      expect(NOW.valueOf()).toStrictEqual(timestamp);
    });

    it("TOMORROW", () => {
      const [TOMORROW] = is.shortTime(["TOMORROW"]);
      const test = new Date();
      test.setHours(0, 0, 0, 0);
      test.setTime(test.getTime() + DAY);
      expect(TOMORROW.valueOf()).toEqual(test.getTime());
    });

    it("AM1", () => {
      const [AM1] = is.shortTime(["AM01"]);
      const test = new Date();
      test.setHours(1, 0, 0, 0);
      expect(AM1.valueOf()).toEqual(test.getTime());
    });

    it("AM11", () => {
      const [AM11] = is.shortTime(["AM11"]);
      const test = new Date();
      test.setHours(11, 0, 0, 0);
      expect(AM11.valueOf()).toEqual(test.getTime());
    });

    it("AM1100", () => {
      const [AM11] = is.shortTime(["AM11:00"]);
      const test = new Date();
      test.setHours(11, 0, 0, 0);
      expect(AM11.valueOf()).toEqual(test.getTime());
    });

    it("PM3", () => {
      const [PM3] = is.shortTime(["PM3"]);
      const test = new Date();
      test.setHours(15, 0, 0, 0);
      expect(PM3.valueOf()).toEqual(test.getTime());
    });

    it("PM9:00", () => {
      const [PM9] = is.shortTime(["PM9:00"]);
      const test = new Date();
      test.setHours(21, 0, 0, 0);
      expect(PM9.valueOf()).toEqual(test.getTime());
    });

    it("PM9:15", () => {
      const [PM915] = is.shortTime(["PM9:15"]);
      const test = new Date();
      test.setHours(21, 15, 0, 0);
      expect(PM915.valueOf()).toEqual(test.getTime());
    });

    it("PM9:30", () => {
      const [PM930] = is.shortTime(["PM9:30"]);
      const test = new Date();
      test.setHours(21, 30, 0, 0);
      expect(PM930.valueOf()).toEqual(test.getTime());
    });

    it("PM9:45", () => {
      const [PM945] = is.shortTime(["PM9:45"]);
      const test = new Date();
      test.setHours(21, 45, 0, 0);
      expect(PM945.valueOf()).toEqual(test.getTime());
    });

    it("AM5:30", () => {
      const [AM530] = is.shortTime(["AM5:30"]);
      const test = new Date();
      test.setHours(5, 30, 0, 0);
      expect(AM530.valueOf()).toEqual(test.getTime());
    });

    it("AM05:30", () => {
      const [AM530] = is.shortTime(["AM05:30"]);
      const test = new Date();
      test.setHours(5, 30, 0, 0);
      expect(AM530.valueOf()).toEqual(test.getTime());
    });
  });
});
