import React from "react";
import renderer from "react-test-renderer";

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
  it("shows the active profile name and import action labels", () => {
    const tree = renderer.create(
      <SourceProfileSection
        profiles={[{ id: "builtin-luna", name: "LunaTV 默认源", type: "builtin", sites: [] }]}
        activeProfileId="builtin-luna"
        onImportPress={jest.fn()}
        onSwitchProfile={jest.fn()}
        onDeleteProfile={jest.fn()}
        onChanged={jest.fn()}
      />
    );

    expect(tree.root.findAllByProps({ children: "当前播放源档案" }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ children: "导入 JSON" }).length).toBeGreaterThan(0);
  });
});
