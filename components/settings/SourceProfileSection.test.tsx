import React from "react";
import renderer, { act } from "react-test-renderer";
import { Pressable } from "react-native";

jest.mock("@/hooks/useResponsiveLayout", () => ({
  useResponsiveLayout: () => ({
    deviceType: "tv",
  }),
}));

jest.mock("@/hooks/useAnimation", () => ({
  useButtonAnimation: () => undefined,
}));

import { SourceProfileSection } from "./SourceProfileSection";

describe("SourceProfileSection", () => {
  it("renders only the restore default action", () => {
    const tree = renderer.create(
      <SourceProfileSection
        onRestoreDefault={jest.fn()}
      />
    );

    expect(
      tree.root.findAll(
        (node) => node.type === Pressable && node.props.accessibilityLabel === "恢复 LunaTV 默认源"
      )
    ).toHaveLength(1);
    expect(tree.root.findAllByProps({ placeholder: "输入播放源档案 JSON 网址" })).toHaveLength(0);
  });

  it("triggers the restore handler when pressed", () => {
    const onRestoreDefault = jest.fn();
    const tree = renderer.create(
      <SourceProfileSection
        onRestoreDefault={onRestoreDefault}
      />
    );

    const restoreButton = tree.root.findByProps({ accessibilityLabel: "恢复 LunaTV 默认源" });

    act(() => {
      restoreButton.props.onPress();
    });

    expect(onRestoreDefault).toHaveBeenCalledTimes(1);
  });
});
