import type { PlayRecord } from "@/services/storage";

export interface PlayHistoryItem extends PlayRecord {
  key: string;
  id: string;
  source: string;
  progress: number;
  sourceName: string;
  totalEpisodes: number;
  episodeIndex: number;
  lastPlayed: number;
}

export function mapPlayRecordsToHistoryItems(records: Record<string, PlayRecord>): PlayHistoryItem[] {
  return Object.entries(records)
    .map(([key, record]) => {
      const [source, id] = key.split("+");
      const progress =
        record.total_time > 0 ? Math.min(record.play_time / record.total_time, 1) : 0;

      return {
        ...record,
        key,
        id,
        source,
        progress,
        sourceName: record.source_name,
        totalEpisodes: record.total_episodes,
        episodeIndex: record.index,
        lastPlayed: record.save_time,
      };
    })
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
}
