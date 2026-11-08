import { edgeRequest } from './edgeApi';

export const reviewApi = {
  get: () => edgeRequest('/v1/reviews/me', { method: 'GET' }),
  submit: (rating, comment) => edgeRequest('/v1/reviews/me', { body: { rating, comment } }),
};
