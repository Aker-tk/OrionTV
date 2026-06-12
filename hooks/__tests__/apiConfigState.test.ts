import { buildApiConfigStatus } from "../apiConfigState";
import { LOCAL_MODE_BASE_URL } from "@/utils/localMode";

describe("buildApiConfigStatus", () => {
  it("treats local mode as configured and valid", () => {
    expect(
      buildApiConfigStatus({
        apiBaseUrl: LOCAL_MODE_BASE_URL,
        isLoadingServerConfig: false,
        serverConfig: null,
        validationState: {
          isValidating: false,
          isValid: null,
          error: null,
        },
      })
    ).toEqual({
      isConfigured: true,
      isValidating: false,
      isValid: true,
      error: null,
      needsConfiguration: false,
      isLocalMode: true,
    });
  });

  it("keeps remote mode invalid when configuration failed", () => {
    expect(
      buildApiConfigStatus({
        apiBaseUrl: "https://demo.example.com",
        isLoadingServerConfig: false,
        serverConfig: null,
        validationState: {
          isValidating: false,
          isValid: false,
          error: "服务器连接失败",
        },
      })
    ).toEqual({
      isConfigured: true,
      isValidating: false,
      isValid: false,
      error: "服务器连接失败",
      needsConfiguration: false,
      isLocalMode: false,
    });
  });
});
