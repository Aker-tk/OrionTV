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
  it("shows the active profile name and URL input", () => {
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId="builtin-luna"
        importUrl=""
        onImportUrlChange={jest.fn()}
        onSwitchProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
      />
    );

    expect(tree.root.findAllByProps({ children: "当前播放源档案" }).length).toBeGreaterThan(0);
    expect(tree.root.findByProps({ placeholder: "输入播放源档案 JSON 网址" })).toBeTruthy();
  });

  it("shows the URL input with value", () => {
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId="builtin-luna"
        importUrl="https://example.com/profile.json"
        onImportUrlChange={jest.fn()}
        onSwitchProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
      />
    );

    expect(tree.root.findByProps({ placeholder: "输入播放源档案 JSON 网址" }).props.value).toBe(
      "https://example.com/profile.json"
    );
  });

  it("allows selecting the default LunaTV profile directly", () => {
    const onSwitchProfile = jest.fn();
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId={null}
        importUrl=""
        onImportUrlChange={jest.fn()}
        onSwitchProfile={onSwitchProfile}
        onDeleteProfile={jest.fn()}
      />
    );

    const profileButton = tree.root.findAllByType(Pressable).find(
      (button) => button.props.children?.props?.children === "LunaTV 默认源"
    );

    act(() => {
      profileButton?.props.onPress();
    });

    expect(onSwitchProfile).toHaveBeenCalledWith("builtin-luna");
  });
});
