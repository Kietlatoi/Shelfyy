import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { trialApi } from '../api/trialApi';
import { pageContent } from '../api/adapters';
import { isTrialPending, syncPendingTrials } from '../utils/trialHistory';

export function useTrialHistory() {
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [revision, setRevision] = useState(0);
  const refreshHistory = useCallback(() => setRevision((value) => value + 1), []);

  useFocusEffect(useCallback(() => {
    let active = true;
    let timer;
    let attempts = 0;

    async function load() {
      try {
        const items = pageContent(await trialApi.getHistory({ size: 10 }));
        if (!active) return;
        setHistory(items);
        setHistoryError('');
        // The status endpoint persists provider results that arrived while
        // the app was closed. History alone only reads the saved database state.
        const synced = await syncPendingTrials(items, trialApi.getStatus);
        if (!active) return;
        setHistory(synced);
        if (synced.some(isTrialPending)) {
          attempts += 1;
          if (attempts < 60) timer = setTimeout(load, 5000);
          else setHistoryError('Một số lượt vẫn chưa có kết quả. Nhấn Cập nhật để kiểm tra lại.');
        }
      } catch {
        if (active) setHistoryError('Chưa tải được lịch sử. Nhấn Cập nhật để thử lại.');
      }
    }

    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  // The dependency intentionally recreates the focus callback when refreshHistory advances it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]));

  return { history, historyError, refreshHistory };
}
