export const sanitizeIndiaMobileDigits = (value?: string | null) => {
  return (value ?? '').replace(/\D/g, '').slice(0, 10);
};

export const normalizeIndiaPhoneForFirebase = (value?: string | null) => {
  const rawDigits = (value ?? '').replace(/\D/g, '');

  if (rawDigits.length === 10) {
    return `+91${rawDigits}`;
  }

  if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
    return `+91${rawDigits.slice(1)}`;
  }

  if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
    return `+${rawDigits}`;
  }

  return rawDigits ? `+${rawDigits}` : '';
};

export const formatIndiaPhoneNumber = (value?: string | null) => {
  const digits = sanitizeIndiaMobileDigits(value);
  return digits ? `+91 ${digits}` : '';
};
