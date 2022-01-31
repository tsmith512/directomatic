import { RedirectCode } from '.';

export const validatePath = (input: string): string => {
  // @TODO: Need to do verification of URI paths here.
  return input;
};

export const validateBoolean = (
  input: string | boolean | undefined,
  preferred: boolean
): boolean => {
  if (typeof input === 'undefined') {
    return preferred;
  } else if (typeof input === 'string' && input.length === 0) {
    return preferred;
  }
  const test = input.toString().toLowerCase();
  if (['y', '1', 'yes', 'true'].includes(test)) {
    return true;
  } else if (['n', '0', 'no', 'false'].includes(test)) {
    return false;
  } else {
    return preferred;
  }
};

export const validateCode = (
  input: number | string | undefined,
  preferred: RedirectCode
): RedirectCode => {
  if (!input) {
    return preferred;
  }

  const test = parseInt(input.toString());
  const codes = [301, 302, 307, 308];

  if (codes.includes(test)) {
    return test as RedirectCode;
  }

  return preferred;
};
