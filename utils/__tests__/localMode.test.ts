import { LOCAL_MODE_BASE_URL, isLocalModeApiBaseUrl, normalizeApiBaseUrl } from "../localMode";

describe("localMode", () => {
  describe("isLocalModeApiBaseUrl", () => {
    it("treats empty values as local mode", () => {
      expect(isLocalModeApiBaseUrl()).toBe(true);
      expect(isLocalModeApiBaseUrl("")).toBe(true);
      expect(isLocalModeApiBaseUrl("   ")).toBe(true);
    });

    it("treats the local mode URL as local mode", () => {
      expect(isLocalModeApiBaseUrl(LOCAL_MODE_BASE_URL)).toBe(true);
    });

    it("does not treat remote URLs as local mode", () => {
      expect(isLocalModeApiBaseUrl("http://10.0.0.1:3000")).toBe(false);
      expect(isLocalModeApiBaseUrl("https://example.com")).toBe(false);
    });
  });

  describe("normalizeApiBaseUrl", () => {
    it("normalizes empty values to the local mode URL", () => {
      expect(normalizeApiBaseUrl("")).toBe(LOCAL_MODE_BASE_URL);
      expect(normalizeApiBaseUrl(undefined)).toBe(LOCAL_MODE_BASE_URL);
    });

    it("keeps the local mode URL stable", () => {
      expect(normalizeApiBaseUrl(LOCAL_MODE_BASE_URL)).toBe(LOCAL_MODE_BASE_URL);
    });

    it("adds http for raw IP and port hosts", () => {
      expect(normalizeApiBaseUrl("10.0.0.1:8080")).toBe("http://10.0.0.1:8080");
    });

    it("adds https for domain-style hosts", () => {
      expect(normalizeApiBaseUrl("demo.example.com")).toBe("https://demo.example.com");
    });

    it("trims trailing slashes from remote URLs", () => {
      expect(normalizeApiBaseUrl("https://demo.example.com/")).toBe("https://demo.example.com");
    });
  });
});
