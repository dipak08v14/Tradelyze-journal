import { useState } from 'react';

export function useActiveAccount() {
  const [activeAccount, setActiveAccount] = useState<string>(() => {
    return localStorage.getItem('tl-active-account') || 'all';
  });

  const updateActiveAccount = (account: string) => {
    setActiveAccount(account);
    localStorage.setItem('tl-active-account', account);
  };

  return {
    activeAccount,
    setActiveAccount: updateActiveAccount
  };
}

/**
 * Applies the account filter to a Supabase query.
 * @param query The Supabase query builder instance
 * @param activeAccount The current active account login string (or 'all')
 * @returns The modified query builder
 */
export function applyAccountFilter(query: any, activeAccount: string) {
  if (activeAccount && activeAccount !== 'all') {
    return query.eq('account_login', activeAccount);
  }
  return query;
}
