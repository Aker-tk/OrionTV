import React from "react";
import renderer, { act } from "react-test-renderer";
import { FlatList, Text } from "react-native";

import CustomScrollView from "../CustomScrollView";

jest.mock("@/hooks/useResponsiveLayout", () => ({
  useResponsiveLayout: () => ({
    deviceType: "tv",
    columns: 5,
    cardWidth: 180,
    cardHeight: 270,
    spacing: 16,
    isPortrait: false,
    screenWidth: 1920,
    screenHeight: 1080,
  }),
}));

describe("CustomScrollView", () => {
  it("keeps TV list rendering conservative for focus performance", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <CustomScrollView
          data={Array.from({ length: 80 }, (_, index) => ({ id: index }))}
          renderItem={({ item }) => <Text>{item.id}</Text>}
        />
      );
    });

    const list = tree!.root.findByType(FlatList);

    expect(list.props.updateCellsBatchingPeriod).toBe(50);
    expect(list.props.scrollEventThrottle).toBe(64);
    expect(list.props.initialNumToRender).toBe(10);
    expect(list.props.maxToRenderPerBatch).toBe(10);
  });

  it("calls onEndReached once for repeated bottom scroll events before loading state updates", () => {
    const onEndReached = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <CustomScrollView
          data={Array.from({ length: 80 }, (_, index) => ({ id: index }))}
          renderItem={({ item }) => <Text>{item.id}</Text>}
          onEndReached={onEndReached}
        />
      );
    });

    const list = tree!.root.findByType(FlatList);
    const bottomScrollEvent = {
      nativeEvent: {
        layoutMeasurement: { height: 500 },
        contentOffset: { y: 900 },
        contentSize: { height: 1000 },
      },
    };

    act(() => {
      list.props.onScroll(bottomScrollEvent);
      list.props.onScroll(bottomScrollEvent);
    });

    expect(onEndReached).toHaveBeenCalledTimes(1);
  });
});
