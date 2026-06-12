import { mapPlayRecordsToHistoryItems } from "../playHistoryUtils";

describe("mapPlayRecordsToHistoryItems", () => {
  it("maps and sorts play records by last played time descending", () => {
    const items = mapPlayRecordsToHistoryItems({
      "ffzy+100": {
        title: "第一部",
        source_name: "非凡资源",
        cover: "https://example.com/1.jpg",
        index: 2,
        total_episodes: 12,
        play_time: 50,
        total_time: 100,
        save_time: 1000,
        year: "2024",
      },
      "dbzy+200": {
        title: "第二部",
        source_name: "豆瓣资源",
        cover: "https://example.com/2.jpg",
        index: 1,
        total_episodes: 24,
        play_time: 75,
        total_time: 150,
        save_time: 2000,
        year: "2025",
      },
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      key: "dbzy+200",
      id: "200",
      source: "dbzy",
      title: "第二部",
      sourceName: "豆瓣资源",
      episodeIndex: 1,
      totalEpisodes: 24,
      progress: 0.5,
      lastPlayed: 2000,
    });
    expect(items[1]).toMatchObject({
      key: "ffzy+100",
      id: "100",
      source: "ffzy",
      title: "第一部",
      progress: 0.5,
      lastPlayed: 1000,
    });
  });

  it("guards against division by zero when total_time is missing", () => {
    const items = mapPlayRecordsToHistoryItems({
      "ffzy+100": {
        title: "第一部",
        source_name: "非凡资源",
        cover: "https://example.com/1.jpg",
        index: 2,
        total_episodes: 12,
        play_time: 50,
        total_time: 0,
        save_time: 1000,
        year: "2024",
      },
    });

    expect(items[0].progress).toBe(0);
  });
});
