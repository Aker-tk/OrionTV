# Source Profile JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build source-profile based playback source management with builtin JSON presets, local `LunaTV-config.json` import, persistent profile switching, and imported-profile deletion without breaking existing search/detail/play flows.

**Architecture:** Keep `lunaConfig.getApiSites()` as the stable interface and move all new behavior behind it. Introduce `SourceProfile` types plus migration-aware config persistence, then layer in JSON parsing utilities and a focused settings UI for active profile, switching, importing, and deleting imported profiles.

**Tech Stack:** React Native TV, Expo 51, TypeScript, Zustand, AsyncStorage, Jest, `expo-document-picker`

---

### Task 1: Add source-profile types and migration-aware config storage

**Files:**
- Create: `services/luna/builtinProfiles.ts`
- Modify: `services/luna/types.ts`
- Modify: `services/luna/config.ts`
- Test: `services/__tests__/lunaConfig.test.ts`

- [ ] **Step 1: Write the failing tests for default profiles and legacy migration**

```ts
it("returns api sites from the active source profile", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({
      sourceProfiles: [
        {
          id: "builtin-luna",
          name: "LunaTV 默认源",
          type: "builtin",
          sites: [{ key: "dbzy_tv", api: "https://caiji.dbzy5.com/api.php/provide/vod", name: "🎬豆瓣资源" }],
        },
      ],
      activeSourceProfileId: "builtin-luna",
      customCategories: [],
      siteName: "LunaTV",
      searchMaxPage: 3,
      doubanProxyType: "cmliussss-cdn-ali",
      disableYellowFilter: false,
    })
  );

  const sites = await lunaConfig.getApiSites();

  expect(sites).toEqual([
    { key: "dbzy_tv", api: "https://caiji.dbzy5.com/api.php/provide/vod", name: "🎬豆瓣资源" },
  ]);
});

it("migrates legacy apiSites storage into sourceProfiles", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify({
      apiSites: [{ key: "legacy", api: "https://legacy.example/api.php/provide/vod", name: "旧配置" }],
      customCategories: [],
      siteName: "LunaTV",
      searchMaxPage: 3,
      doubanProxyType: "cmliussss-cdn-ali",
      disableYellowFilter: false,
    })
  );

  const config = await lunaConfig.getConfig();

  expect(config.sourceProfiles.some((profile) => profile.sites.some((site) => site.key === "legacy"))).toBe(true);
  expect(config.activeSourceProfileId).toBeTruthy();
  expect(AsyncStorage.setItem).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest --runInBand services/__tests__/lunaConfig.test.ts`
Expected: FAIL because `AppConfig` and `LunaConfig` do not yet support `sourceProfiles` or legacy migration.

- [ ] **Step 3: Write the minimal implementation**

```ts
export interface SourceProfile {
  id: string;
  name: string;
  type: "builtin" | "imported";
  sites: ApiSite[];
  importedAt?: number;
}

export interface AppConfig {
  sourceProfiles: SourceProfile[];
  activeSourceProfileId: string;
  customCategories: CustomCategory[];
  siteName: string;
  searchMaxPage: number;
  doubanProxyType: string;
  disableYellowFilter: boolean;
}

export const BUILTIN_SOURCE_PROFILES: SourceProfile[] = [
  {
    id: "builtin-luna",
    name: "LunaTV 默认源",
    type: "builtin",
    sites: DEFAULT_API_SITES,
  },
];

function ensureConfigShape(raw: any): AppConfig {
  if (raw?.sourceProfiles?.length && raw?.activeSourceProfileId) {
    return { ...DEFAULT_CONFIG, ...raw };
  }

  if (Array.isArray(raw?.apiSites)) {
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      sourceProfiles: [
        {
          id: "migrated-legacy",
          name: "旧版播放源",
          type: "imported",
          sites: raw.apiSites,
          importedAt: Date.now(),
        },
        ...BUILTIN_SOURCE_PROFILES,
      ],
      activeSourceProfileId: "migrated-legacy",
    };
  }

  return { ...DEFAULT_CONFIG };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn jest --runInBand services/__tests__/lunaConfig.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/luna/types.ts services/luna/config.ts services/luna/builtinProfiles.ts services/__tests__/lunaConfig.test.ts
git commit -m "feat: add source profile config model"
```

### Task 2: Add import parsing, profile naming, switching, and deletion utilities

**Files:**
- Create: `services/luna/sourceProfileUtils.ts`
- Modify: `services/luna/config.ts`
- Test: `services/__tests__/sourceProfileUtils.test.ts`
- Test: `services/__tests__/lunaConfig.test.ts`

- [ ] **Step 1: Write the failing tests for JSON import parsing and profile operations**

```ts
it("parses LunaTV-config.json into api sites and skips invalid entries", () => {
  const result = parseLunaTvConfigJson(
    JSON.stringify({
      api_site: {
        "dbzy.tv": { name: "豆瓣资源", api: "https://caiji.dbzy5.com/api.php/provide/vod", detail: "https://dbzy.tv" },
        "broken.tv": { name: "坏数据" },
      },
    })
  );

  expect(result.sites).toEqual([
    {
      key: "dbzy_tv",
      name: "豆瓣资源",
      api: "https://caiji.dbzy5.com/api.php/provide/vod",
      detail: "https://dbzy.tv",
    },
  ]);
  expect(result.skippedCount).toBe(1);
});

it("falls back to the builtin profile when removing the active imported profile", async () => {
  await lunaConfig.importSourceProfile("我的源.json", JSON.stringify({ api_site: { "dbzy.tv": { name: "豆瓣资源", api: "https://caiji.dbzy5.com/api.php/provide/vod" } } }));
  const activeId = await lunaConfig.getActiveSourceProfileId();
  await lunaConfig.removeSourceProfile(activeId);

  const config = await lunaConfig.getConfig();

  expect(config.activeSourceProfileId).toBe("builtin-luna");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn jest --runInBand services/__tests__/sourceProfileUtils.test.ts services/__tests__/lunaConfig.test.ts`
Expected: FAIL because parse/import/remove helpers do not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function parseLunaTvConfigJson(raw: string): { sites: ApiSite[]; skippedCount: number } {
  const parsed = JSON.parse(raw);
  if (!parsed?.api_site || typeof parsed.api_site !== "object") {
    throw new Error("unsupported_lunatv_config");
  }

  const siteMap = new Map<string, ApiSite>();
  let skippedCount = 0;

  for (const [host, value] of Object.entries(parsed.api_site)) {
    if (!value || typeof value !== "object" || !("name" in value) || !("api" in value)) {
      skippedCount += 1;
      continue;
    }

    siteMap.set(normalizeProfileSiteKey(host), {
      key: normalizeProfileSiteKey(host),
      name: String((value as any).name),
      api: String((value as any).api),
      detail: (value as any).detail ? String((value as any).detail) : undefined,
    });
  }

  return { sites: [...siteMap.values()], skippedCount };
}

async importSourceProfile(fileName: string, rawJson: string): Promise<{ profile: SourceProfile; skippedCount: number }> {
  const { sites, skippedCount } = parseLunaTvConfigJson(rawJson);
  if (sites.length === 0) throw new Error("empty_source_profile");

  const current = await this.getConfig();
  const name = buildUniqueProfileName(stripJsonExtension(fileName), current.sourceProfiles);
  const profile: SourceProfile = {
    id: `imported-${Date.now()}`,
    name,
    type: "imported",
    sites,
    importedAt: Date.now(),
  };

  await this.updateConfig({
    sourceProfiles: [...current.sourceProfiles, profile],
    activeSourceProfileId: profile.id,
  });

  return { profile, skippedCount };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn jest --runInBand services/__tests__/sourceProfileUtils.test.ts services/__tests__/lunaConfig.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/luna/sourceProfileUtils.ts services/luna/config.ts services/__tests__/sourceProfileUtils.test.ts services/__tests__/lunaConfig.test.ts
git commit -m "feat: add source profile import and lifecycle helpers"
```

### Task 3: Add source-profile state access for the settings screen

**Files:**
- Modify: `stores/sourceStore.ts`
- Modify: `services/luna/index.ts`
- Test: `stores/__tests__/sourceStoreUtils.test.ts`

- [ ] **Step 1: Write the failing test for refreshing resources after profile switching**

```ts
it("keeps resource toggles working after source resources reload", () => {
  expect(
    toggleVideoSourceSelection(
      {
        enabledAll: false,
        sources: { dbzy_tv: true, ffzyapi_com: false },
      },
      "ffzyapi_com"
    )
  ).toEqual({
    enabledAll: true,
    sources: { dbzy_tv: true, ffzyapi_com: true },
  });
});
```

- [ ] **Step 2: Run tests to verify they fail when profile-aware store changes are incomplete**

Run: `yarn jest --runInBand stores/__tests__/sourceStoreUtils.test.ts`
Expected: FAIL if the store changes break existing toggle semantics or exports.

- [ ] **Step 3: Write the minimal implementation**

```ts
interface SourceState {
  resources: ApiSite[];
  profiles: SourceProfile[];
  activeProfileId: string | null;
  loadResources: () => Promise<void>;
  loadProfiles: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  removeProfile: (profileId: string) => Promise<void>;
  importProfileFromJson: (fileName: string, rawJson: string) => Promise<{ skippedCount: number }>;
  toggleResourceEnabled: (resourceKey: string) => void;
}

loadResources: async () => {
  const [resources, profiles, activeProfileId] = await Promise.all([
    lunaConfig.getApiSites(),
    lunaConfig.getSourceProfiles(),
    lunaConfig.getActiveSourceProfileId(),
  ]);
  set({ resources, profiles, activeProfileId });
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn jest --runInBand stores/__tests__/sourceStoreUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add stores/sourceStore.ts services/luna/index.ts stores/__tests__/sourceStoreUtils.test.ts
git commit -m "feat: expose source profile state to settings"
```

### Task 4: Add the settings UI for active profile, switching, importing, and deletion

**Files:**
- Create: `components/settings/SourceProfileSection.tsx`
- Modify: `app/settings.tsx`
- Modify: `package.json`
- Test: `components/settings/SourceProfileSection.tsx` via manual adb verification

- [ ] **Step 1: Write the failing UI expectation in a focused component test or interaction stub**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn jest --runInBand components/settings/SourceProfileSection.test.tsx`
Expected: FAIL because the section component does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```tsx
import * as DocumentPicker from "expo-document-picker";

export function SourceProfileSection(...) {
  return (
    <SettingsSection focusable onFocus={onFocus} onBlur={onBlur}>
      <ThemedText style={styles.sectionTitle}>播放源档案</ThemedText>
      <ThemedText style={styles.activeProfileLabel}>当前播放源档案</ThemedText>
      <ThemedText style={styles.activeProfileValue}>{activeProfile?.name ?? "未选择"}</ThemedText>
      <StyledButton title="导入 JSON" onPress={onImportPress} />
      {profiles.map((profile) => (
        <View key={profile.id}>
          <StyledButton title={profile.name} onPress={() => onSwitchProfile(profile.id)} />
          {profile.type === "imported" ? (
            <StyledButton title={`删除 ${profile.name}`} onPress={() => onDeleteProfile(profile.id)} />
          ) : null}
        </View>
      ))}
    </SettingsSection>
  );
}
```

- [ ] **Step 4: Run test and typecheck to verify the UI passes**

Run: `yarn jest --runInBand components/settings/SourceProfileSection.test.tsx && yarn typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/settings/SourceProfileSection.tsx app/settings.tsx package.json yarn.lock
git commit -m "feat: add source profile management settings UI"
```

### Task 5: Verify import flow, migration, and adb behavior end to end

**Files:**
- Modify: `services/__tests__/lunaConfig.test.ts`
- Modify: `services/__tests__/sourceProfileUtils.test.ts`
- Verify: Android TV emulator via `adb`

- [ ] **Step 1: Add the final failing regression tests for delete fallback and empty-import rejection**

```ts
it("rejects configs that contain no valid sites", () => {
  expect(() =>
    parseLunaTvConfigJson(JSON.stringify({ api_site: { broken: { name: "坏数据" } } }))
  ).toThrow("empty_source_profile");
});

it("removes only imported profiles and keeps builtin profiles intact", async () => {
  await expect(lunaConfig.removeSourceProfile("builtin-luna")).rejects.toThrow("builtin_profile_cannot_be_removed");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn jest --runInBand services/__tests__/lunaConfig.test.ts services/__tests__/sourceProfileUtils.test.ts`
Expected: FAIL until the guard rails are implemented.

- [ ] **Step 3: Write the minimal implementation**

```ts
if (sites.length === 0) {
  throw new Error("empty_source_profile");
}

if (profile.type === "builtin") {
  throw new Error("builtin_profile_cannot_be_removed");
}
```

- [ ] **Step 4: Run full verification**

Run:

```bash
yarn jest --runInBand services/__tests__/lunaConfig.test.ts services/__tests__/sourceProfileUtils.test.ts stores/__tests__/sourceStoreUtils.test.ts
yarn typecheck
adb -s emulator-5554 shell am force-stop com.lunatv.app
adb -s emulator-5554 shell pm clear com.lunatv.app
cd android && ./gradlew installDebug
adb -s emulator-5554 shell monkey -p com.lunatv.app -c android.intent.category.LAUNCHER 1
adb -s emulator-5554 logcat -v time -t 200 | rg "FATAL EXCEPTION|ReactNativeJS|source profile|JSON|import"
```

Expected:
- Jest suites PASS
- `yarn typecheck` exits 0
- Debug APK installs successfully
- App launches without fatal crash
- Import/switch/delete flows can be exercised manually in settings

- [ ] **Step 5: Commit**

```bash
git add services/__tests__/lunaConfig.test.ts services/__tests__/sourceProfileUtils.test.ts
git commit -m "test: cover source profile edge cases"
```

## Self-Review

- Spec coverage:
  - `sourceProfiles + activeSourceProfileId`: covered in Task 1
  - builtin JSON extraction: covered in Task 1 and Task 2
  - local `LunaTV-config.json` import: covered in Task 2 and Task 4
  - current profile display / switching / deletion: covered in Task 3 and Task 4
  - legacy `apiSites` migration: covered in Task 1
  - adb validation: covered in Task 5
- Placeholder scan:
  - No `TODO`/`TBD`
  - Each code-changing task includes concrete snippets and commands
  - Expected outputs are stated for each verification step
- Type consistency:
  - Uses `SourceProfile`, `AppConfig.sourceProfiles`, and `activeSourceProfileId` consistently across config, store, and UI tasks
  - `importSourceProfile`, `switchProfile`, and `removeSourceProfile` names stay consistent across tasks

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-12-source-profile-json-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
