import { getResolutionFromM3U8 } from "../m3u8";

describe("getResolutionFromM3U8", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("fetches and parses M3U8 URLs with query strings", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue([
        "#EXTM3U",
        "#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720",
        "720p.m3u8",
      ].join("\n")),
    });
    global.fetch = fetchMock;

    await expect(getResolutionFromM3U8("https://example.com/master.m3u8?token=abc")).resolves.toBe("720p");
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/master.m3u8?token=abc", { signal: undefined });
  });

  it("rethrows AbortError from fetch", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(getResolutionFromM3U8("https://example.com/abort.m3u8")).rejects.toBe(abortError);
  });
});
