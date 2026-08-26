import { Currency } from '../types';

export const formatCurrency = (amount: number, currency: Currency = 'USD', compact: boolean = false): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted = '';

  if (currency === 'IDR') {
    if (compact && absAmount >= 1_000_000) {
      formatted = `Rp ${(absAmount / 1_000_000).toFixed(1)}Jt`;
    } else {
      formatted = `Rp ${absAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
    }
  } else if (currency === 'EUR') {
    formatted = `€${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'GBP') {
    formatted = `£${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'JPY') {
    formatted = `¥${absAmount.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
  } else {
    // USD default
    if (compact && absAmount >= 1_000_000) {
      formatted = `$${(absAmount / 1_000_000).toFixed(2)}M`;
    } else if (compact && absAmount >= 1_000) {
      formatted = `$${(absAmount / 1_000).toFixed(1)}K`;
    } else {
      formatted = `$${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  return isNegative ? `-${formatted}` : formatted;
};

export const formatPercent = (percent: number, showSign: boolean = true): string => {
  const sign = showSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
};

export const formatDate = (dateStr: string, includeTime: boolean = false): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    if (includeTime) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const formatDateTimeDDMMYYYY = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
};

export const formatDuration = (minutes: number): string => {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '0m';
  const totalMins = Math.round(minutes);
  const days = Math.floor(totalMins / (24 * 60));
  const remainingHours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;

  if (days > 0) {
    return `${days}d ${remainingHours}h ${mins}m`;
  }
  if (remainingHours > 0) {
    return `${remainingHours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};
