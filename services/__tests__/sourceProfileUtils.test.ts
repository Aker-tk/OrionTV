import { parseLunaTvConfigJson } from "@/services/luna/sourceProfileUtils";

describe("sourceProfileUtils", () => {
  it("parses LunaTV-config.json into api sites and skips invalid entries", () => {
    const result = parseLunaTvConfigJson(
      JSON.stringify({
        api_site: {
          "dbzy.tv": {
            name: "豆瓣资源",
            api: "https://caiji.dbzy5.com/api.php/provide/vod",
            detail: "https://dbzy.tv",
          },
          "broken.tv": {
            name: "坏数据",
          },
        },
      })
    );

    expect(result.sites).toEqual([
      {
        key: "dbzy_tv",
        name: "豆瓣资源",
        api: "https://caiji.dbzy5.com/api.php/provide/vod",
        detail: "https://dbzy.tv",
      },
    ]);
    expect(result.skippedCount).toBe(1);
  });

  it("rejects unsupported top-level config shapes", () => {
    expect(() =>
      parseLunaTvConfigJson(
        JSON.stringify({
          apiSites: [],
        })
      )
    ).toThrow("unsupported_lunatv_config");
  });
});
