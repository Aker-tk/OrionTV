import PerfTracker from "../PerfTracker";

describe("PerfTracker", () => {
  const originalDev = (global as any).__DEV__;
  const originalPerformance = global.performance;
  const originalDateNow = Date.now;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    let now = 100;
    Object.defineProperty(global, "performance", {
      configurable: true,
      value: {
        now: jest.fn(() => {
          now += 25;
          return now;
        }),
      },
    });
    PerfTracker.clear();
  });

  afterEach(() => {
    (console.info as jest.Mock).mockRestore();
    (global as any).__DEV__ = originalDev;
    Object.defineProperty(global, "performance", {
      configurable: true,
      value: originalPerformance,
    });
    Date.now = originalDateNow;
    PerfTracker.clear();
  });

  it("logs concise durations in development", () => {
    (global as any).__DEV__ = true;

    PerfTracker.mark("Home", "category-select");
    const duration = PerfTracker.measure("Home", "category-select", "content-rendered");

    expect(duration).toBe(25);
    expect(console.info).toHaveBeenCalledWith("[PERF][Home] category-select -> content-rendered: 25.00ms");
  });

  it("appends metadata to development logs", () => {
    (global as any).__DEV__ = true;

    PerfTracker.mark("Home", "category-select");
    PerfTracker.measure("Home", "category-select", "content-rendered", "featured");

    expect(console.info).toHaveBeenCalledWith(
      "[PERF][Home] category-select -> content-rendered: 25.00ms (featured)",
    );
  });

  it("does not log when development mode is disabled", () => {
    (global as any).__DEV__ = false;

    PerfTracker.mark("Home", "category-select");
    const duration = PerfTracker.measure("Home", "category-select", "content-rendered");

    expect(duration).toBeNull();
    expect(console.info).not.toHaveBeenCalled();
  });

  it("times synchronous callbacks in development", () => {
    (global as any).__DEV__ = true;

    const result = PerfTracker.time("Home", "load-categories", () => "loaded", "cached");

    expect(result).toBe("loaded");
    expect(console.info).toHaveBeenCalledWith("[PERF][Home] load-categories: 25.00ms (cached)");
  });

  it("runs synchronous callbacks without logging when disabled", () => {
    (global as any).__DEV__ = false;
    const callback = jest.fn(() => "loaded");

    const result = PerfTracker.time("Home", "load-categories", callback, "cached");

    expect(result).toBe("loaded");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("times asynchronous callbacks in development", async () => {
    (global as any).__DEV__ = true;

    const result = await PerfTracker.timeAsync("Home", "load-categories", async () => "loaded");

    expect(result).toBe("loaded");
    expect(console.info).toHaveBeenCalledWith("[PERF][Home] load-categories: 25.00ms");
  });

  it("runs asynchronous callbacks without logging when disabled", async () => {
    (global as any).__DEV__ = false;
    const callback = jest.fn(async () => "loaded");

    const result = await PerfTracker.timeAsync("Home", "load-categories", callback);

    expect(result).toBe("loaded");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("clears marks for a single flow", () => {
    (global as any).__DEV__ = true;

    PerfTracker.mark("Home", "category-select");
    PerfTracker.mark("Search", "query-start");
    PerfTracker.clear("Home");

    expect(PerfTracker.measure("Home", "category-select", "content-rendered")).toBeNull();
    expect(PerfTracker.measure("Search", "query-start", "results-rendered")).toBe(25);
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it("falls back to Date.now when performance.now is unavailable", () => {
    (global as any).__DEV__ = true;
    let now = 500;
    Date.now = jest.fn(() => {
      now += 10;
      return now;
    });
    Object.defineProperty(global, "performance", {
      configurable: true,
      value: undefined,
    });

    PerfTracker.mark("Home", "category-select");
    const duration = PerfTracker.measure("Home", "category-select", "content-rendered");

    expect(duration).toBe(10);
    expect(console.info).toHaveBeenCalledWith("[PERF][Home] category-select -> content-rendered: 10.00ms");
  });
});
