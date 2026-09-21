let accountId: string | null = null;
export function setAccountScope(id: string | null) { accountId = id; }
export function getAccountScope() { return accountId; }
export function accountKey(key: string) { return accountId ? `mjh.account.${accountId}.${key}` : key; }
export const accountStorage = {
  getItem(key: string) { return localStorage.getItem(accountKey(key)); },
  setItem(key: string, value: string) { localStorage.setItem(accountKey(key), value); },
};
