import { buildImageSource } from "@/services/imageSource";

describe("buildImageSource", () => {
  it("rewrites douban image urls to the stable proxy domain", () => {
    expect(
      buildImageSource("https://img2.doubanio.com/view/photo/s_ratio_poster/public/p2933103931.jpg")
    ).toEqual({
      uri: "https://img.doubanio.cmliussss.net/view/photo/s_ratio_poster/public/p2933103931.jpg",
    });
  });

  it("leaves non-douban image urls untouched", () => {
    expect(buildImageSource("https://example.com/poster.jpg")).toEqual({
      uri: "https://example.com/poster.jpg",
    });
  });
});
