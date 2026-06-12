jest.mock("@/services/luna/types", () => ({}));

import { getDoubanData } from "@/services/luna/douban";

describe("douban image handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("keeps the original douban poster url instead of rewriting it to a proxy domain", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        subjects: [
          {
            id: "1",
            title: "铁拳教育",
            cover: "https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2933103931.jpg",
            rate: "8.8",
            year: "2026",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await getDoubanData("tv", "热门", 20, 0);

    expect(result.list).toEqual([
      {
        id: "1",
        title: "铁拳教育",
        poster: "https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2933103931.jpg",
        rate: "8.8",
        year: "2026",
      },
    ]);
  });

  it("does not rewrite img9.doubanio.com posters to the old proxy domain", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        subjects: [
          {
            id: "2",
            title: "莫离",
            cover: "https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932891615.jpg",
            rate: "",
            year: null,
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await getDoubanData("tv", "热门", 20, 0);

    expect(result.list[0].poster).toBe(
      "https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2932891615.jpg"
    );
  });
});
