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

jest.mock("@/stores/settingsStore", () => ({
  useSettingsStore: () => ({
    remoteInputEnabled: true,
  }),
}));

jest.mock("@/stores/remoteControlStore", () => ({
  useRemoteControlStore: () => ({
    serverUrl: "http://192.168.1.10:8080",
  }),
}));

import { SourceProfileImportSection } from "./SourceProfileImportSection";

describe("SourceProfileImportSection", () => {
  it("does not show the manual import button", () => {
    const tree = renderer.create(
      <SourceProfileImportSection
        importUrl=""
        onImportUrlChange={jest.fn()}
      />
    );

    expect(tree.root.findAllByProps({ children: "输入网址导入" })).toHaveLength(0);
  });

  it("shows the remote input hint like the live stream URL section", () => {
    const tree = renderer.create(
      <SourceProfileImportSection
        importUrl=""
        onImportUrlChange={jest.fn()}
      />
    );

    expect(
      tree.root.findAll(
        node =>
          Array.isArray(node.props.children) &&
          node.props.children.join("") === "用手机访问 http://192.168.1.10:8080，可远程输入"
      )
    ).not.toHaveLength(0);
  });

  it("renders a source profile URL input like the live stream URL section", () => {
    const onImportUrlChange = jest.fn();
    const tree = renderer.create(
      <SourceProfileImportSection
        importUrl="https://example.com/profile.json"
        onImportUrlChange={onImportUrlChange}
      />
    );

    const input = tree.root.findByProps({ placeholder: "输入播放源档案 JSON 网址" });
    expect(input.props.value).toBe("https://example.com/profile.json");

    act(() => {
      input.props.onChangeText("https://example.com/next.json");
    });

    expect(onImportUrlChange).toHaveBeenCalledWith("https://example.com/next.json");
  });

  it("exposes setInputValue for remote input like the live stream URL section", () => {
    const onImportUrlChange = jest.fn();
    const ref = React.createRef<{ setInputValue: (value: string) => void }>();

    renderer.create(
      <SourceProfileImportSection
        ref={ref}
        importUrl=""
        onImportUrlChange={onImportUrlChange}
      />
    );

    act(() => {
      ref.current?.setInputValue("https://example.com/profile.json");
    });

    expect(onImportUrlChange).toHaveBeenCalledWith("https://example.com/profile.json");
  });
});
