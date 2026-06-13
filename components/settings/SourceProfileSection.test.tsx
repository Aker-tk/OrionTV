import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@/hooks/useResponsiveLayout", () => ({
  useResponsiveLayout: () => ({
    deviceType: "tv",
  }),
}));

jest.mock("@/hooks/useAnimation", () => ({
  useButtonAnimation: () => undefined,
}));

import { SourceProfileSection } from "./SourceProfileSection";
import { StyledButton } from "@/components/StyledButton";

describe("SourceProfileSection", () => {
  it("shows the active profile name and import action labels", () => {
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId="builtin-luna"
        importUrl=""
        onImportUrlChange={jest.fn()}
        onImportPress={jest.fn()}
        onSwitchProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
        onChanged={jest.fn()}
      />
    );

    expect(tree.root.findAllByProps({ children: "当前播放源档案" }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ children: "输入网址导入" }).length).toBeGreaterThan(0);
  });

  it("shows the URL input immediately and uses one import action", () => {
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId="builtin-luna"
        importUrl="https://example.com/profile.json"
        onImportUrlChange={jest.fn()}
        onImportPress={jest.fn()}
        onSwitchProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
        onChanged={jest.fn()}
      />
    );

    expect(tree.root.findByProps({ placeholder: "输入播放源档案 JSON 网址" }).props.value).toBe(
      "https://example.com/profile.json"
    );
    expect(tree.root.findAllByProps({ text: "导入网址" })).toHaveLength(0);
  });

  it("runs URL import from the visible import action", () => {
    const onImportPress = jest.fn();
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId="builtin-luna"
        importUrl=""
        onImportUrlChange={jest.fn()}
        onImportPress={onImportPress}
        onSwitchProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
        onChanged={jest.fn()}
      />
    );

    act(() => {
      tree.root.findByProps({ text: "输入网址导入" }).props.onPress();
    });

    expect(onImportPress).toHaveBeenCalledTimes(1);
  });

  it("allows selecting the default LunaTV profile directly", () => {
    const onSwitchProfile = jest.fn();
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId={null}
        importUrl=""
        onImportUrlChange={jest.fn()}
        onImportPress={jest.fn()}
        onSwitchProfile={onSwitchProfile}
        onDeleteProfile={jest.fn()}
        onChanged={jest.fn()}
      />
    );

    const profileButton = tree.root.findAllByType(StyledButton).find((button) => button.props.text === "LunaTV 默认源");

    act(() => {
      profileButton?.props.onPress();
    });

    expect(onSwitchProfile).toHaveBeenCalledWith("builtin-luna");
  });
});
