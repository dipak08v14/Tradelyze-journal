import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePreferredCurrency(userId?: string) {
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('tl-preferred-currency') || 'INR';
  });

  useEffect(() => {
    if (!userId) return;
    
    // Check if we need to sync from DB on mount
    const fetchCurrency = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('preferred_currency')
          .eq('id', userId)
          .single();
          
        if (data && data.preferred_currency && data.preferred_currency !== currency) {
          setCurrency(data.preferred_currency);
          localStorage.setItem('tl-preferred-currency', data.preferred_currency);
        }
      } catch (err) {
        console.error("Error fetching preferred currency:", err);
      }
    };
    
    fetchCurrency();
  }, [userId]);

  const updatePreferredCurrency = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('tl-preferred-currency', newCurrency);
    
    // Fire an event in case other components need to update immediately across the app
    window.dispatchEvent(new Event('tl-currency-changed'));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('tl-preferred-currency');
      if (stored && stored !== currency) {
        setCurrency(stored);
      }
    };
    
    window.addEventListener('tl-currency-changed', handleStorageChange);
    return () => window.removeEventListener('tl-currency-changed', handleStorageChange);
  }, [currency]);

  return {
    preferredCurrency: currency,
    setPreferredCurrency: updatePreferredCurrency
  };
}
