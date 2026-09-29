import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';

const getLatestTodaySuggestion = httpsCallable(functions, 'getLatestTodaySuggestion');
const generateTodaySuggestion = httpsCallable(functions, 'generateTodaySuggestion');
let retryableGenerationRequestId = null;

export const suggestionApi = {
  latestToday: async () => {
    const data = (await getLatestTodaySuggestion()).data;
    return data?.suggestion ?? null;
  },
  generateToday: async () => {
    retryableGenerationRequestId ||= `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    const result = await generateTodaySuggestion({ requestId: retryableGenerationRequestId });
    retryableGenerationRequestId = null;
    return result.data;
  },
};
