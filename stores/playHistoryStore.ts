import { create } from "zustand";
import { PlayRecordManager } from "@/services/storage";
import { mapPlayRecordsToHistoryItems, type PlayHistoryItem } from "./playHistoryUtils";

interface PlayHistoryState {
  items: PlayHistoryItem[];
  loading: boolean;
  error: string | null;
  fetchHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

const usePlayHistoryStore = create<PlayHistoryState>((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchHistory: async () => {
    set({ loading: true, error: null });
    try {
      const records = await PlayRecordManager.getAll();
      set({
        items: mapPlayRecordsToHistoryItems(records),
        loading: false,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "获取播放历史失败";
      set({ error, loading: false });
    }
  },

  clearHistory: async () => {
    set({ loading: true, error: null });
    try {
      await PlayRecordManager.clearAll();
      set({ items: [], loading: false });
    } catch (e) {
      const error = e instanceof Error ? e.message : "清空播放历史失败";
      set({ error, loading: false });
    }
  },
}));

export default usePlayHistoryStore;
