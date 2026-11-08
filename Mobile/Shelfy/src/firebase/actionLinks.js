import { parseActionCodeURL } from 'firebase/auth';

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function getPasswordResetCode(params = {}) {
  const directCode = firstValue(params.oobCode);
  const directMode = firstValue(params.mode);
  if (typeof directCode === 'string' && directMode === 'resetPassword') return directCode;

  const candidates = [params.link, params.deep_link_id, params.url]
    .map(firstValue)
    .filter((value) => typeof value === 'string' && value.length > 0);
  for (const candidate of candidates) {
    const action = parseActionCodeURL(candidate);
    if (action?.operation === 'PASSWORD_RESET' && action.code) return action.code;
  }
  return null;
}
