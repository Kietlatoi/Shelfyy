export function isTrialPending(item) {
  return item.status === 'PENDING' || item.status === 'PROCESSING';
}

export async function syncPendingTrials(items, getStatus) {
  return Promise.all(items.map(async (item) => {
    if (!isTrialPending(item)) return item;
    try {
      const updated = await getStatus(item.jobId);
      return { ...item, ...updated };
    } catch {
      // Preserve the last known state if a provider/network request fails.
      return item;
    }
  }));
}
