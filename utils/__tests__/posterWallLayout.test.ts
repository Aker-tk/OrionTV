import { getPosterWallLayout } from "../posterWallLayout";

describe("getPosterWallLayout", () => {
  it("fills a TV row by expanding card width from available space", () => {
    const layout = getPosterWallLayout({
      containerWidth: 1920,
      horizontalPadding: 16,
      gap: 16,
      minCardWidth: 160,
      aspectRatio: 2 / 3,
      maxColumns: 8,
    });

    expect(layout.columns).toBe(8);
    expect(layout.cardWidth).toBe(222);
    expect(layout.cardHeight).toBe(333);
  });

  it("reduces columns on narrower screens while keeping poster ratio", () => {
    const layout = getPosterWallLayout({
      containerWidth: 1280,
      horizontalPadding: 16,
      gap: 16,
      minCardWidth: 160,
      aspectRatio: 2 / 3,
      maxColumns: 8,
    });

    expect(layout.columns).toBe(7);
    expect(layout.cardWidth).toBe(164);
    expect(layout.cardHeight).toBe(246);
  });
});
