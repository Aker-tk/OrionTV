import { filterMatchingResults, isSearchResultMatch } from "../searchMatching";

describe("search matching", () => {
  test("matches exact titles", () => {
    expect(isSearchResultMatch("铁拳教育", "铁拳教育")).toBe(true);
  });

  test("matches titles with punctuation and spacing differences", () => {
    expect(isSearchResultMatch("蝙蝠侠：黑暗骑士", "蝙蝠侠 黑暗骑士")).toBe(true);
    expect(isSearchResultMatch("蝙蝠侠：黑暗骑士", "蝙蝠侠:黑暗骑士")).toBe(true);
  });

  test("matches titles that include extra suffix information", () => {
    expect(isSearchResultMatch("蝙蝠侠：黑暗骑士", "蝙蝠侠：黑暗骑士 2008")).toBe(true);
  });

  test("filters only matching results", () => {
    const results = [
      { title: "蝙蝠侠：黑暗骑士" },
      { title: "蝙蝠侠：黑暗骑士 2008" },
      { title: "新世界" },
    ];

    expect(filterMatchingResults("蝙蝠侠：黑暗骑士", results)).toEqual([
      { title: "蝙蝠侠：黑暗骑士" },
      { title: "蝙蝠侠：黑暗骑士 2008" },
    ]);
  });
});
