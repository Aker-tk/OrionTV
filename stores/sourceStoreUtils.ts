export interface VideoSourceConfig {
  enabledAll: boolean;
  sources: Record<string, boolean>;
}

export function toggleVideoSourceSelection(
  current: VideoSourceConfig,
  resourceKey: string
): VideoSourceConfig {
  const currentEnabled = current.enabledAll ? current.sources[resourceKey] !== false : Boolean(current.sources[resourceKey]);
  const nextSources = { ...current.sources, [resourceKey]: !currentEnabled };

  return {
    enabledAll: Object.values(nextSources).every(Boolean),
    sources: nextSources,
  };
}
