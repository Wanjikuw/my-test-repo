export const PASSWORD_MIN_CHARS = 8;
/** bcrypt, which Supabase hashes with, ignores everything past 72 bytes, and Supabase refuses it. */
export const PASSWORD_MAX_BYTES = 72;
const NAME_MAX_CHARS = 80;
const EMAIL_MAX_CHARS = 254;

export interface LoginValues {
  email: string;
  password: string;
}

export interface SignupValues extends LoginValues {
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

export interface ForgotValues {
  email: string;
}

export interface ResetValues {
  password: string;
  confirmPassword: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** The order the fields appear in, so the first one with a problem is the one to focus. */
export const LOGIN_ORDER: (keyof LoginValues)[] = ['email', 'password'];
export const SIGNUP_ORDER: (keyof SignupValues)[] = [
  'firstName',
  'lastName',
  'email',
  'password',
  'confirmPassword',
];
export const RESET_ORDER: (keyof ResetValues)[] = ['password', 'confirmPassword'];

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email.length === 0) return 'Enter your email address.';
  // A shape check only, to catch a slip while typing. Whether the address works is for the
  // sign-in service to say. The length is checked first, which also bounds the pattern.
  if (email.length > EMAIL_MAX_CHARS || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address, such as name@example.com.';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length === 0) return 'Enter a password.';
  if (value.length < PASSWORD_MIN_CHARS) return `Use at least ${PASSWORD_MIN_CHARS} characters.`;
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return `Use ${PASSWORD_MAX_BYTES} bytes or fewer. Most characters take one; accented and non-Latin letters take more.`;
  }
  return null;
}

function validateName(value: string, label: string): string | null {
  const name = value.trim();
  if (name.length === 0) return `Enter your ${label}.`;
  if (name.length > NAME_MAX_CHARS)
    return `Use ${NAME_MAX_CHARS} characters or fewer for your ${label}.`;
  return null;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Signing in asks only for something in each box. The password rules belong to creating one:
 * applying them here would turn away an account made before they changed.
 */
export function validateLogin(values: LoginValues): FieldErrors<LoginValues> {
  const errors: FieldErrors<LoginValues> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (values.password.length === 0) errors.password = 'Enter your password.';
  return errors;
}

/** The second entry of a new password, which is only worth checking once the first is acceptable. */
function confirmationError(password: string, confirmation: string): string | null {
  if (confirmation.length === 0) return 'Enter the password again to confirm it.';
  return confirmation === password ? null : 'The two passwords do not match.';
}

export function validateSignup(values: SignupValues): FieldErrors<SignupValues> {
  const errors: FieldErrors<SignupValues> = {};
  const firstName = validateName(values.firstName, 'first name');
  if (firstName) errors.firstName = firstName;
  const lastName = validateName(values.lastName, 'last name');
  if (lastName) errors.lastName = lastName;
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  const password = validatePassword(values.password);
  if (password) errors.password = password;

  if (!password) {
    const confirmation = confirmationError(values.password, values.confirmPassword);
    if (confirmation) errors.confirmPassword = confirmation;
  }
  return errors;
}

export function validateForgot(values: ForgotValues): FieldErrors<ForgotValues> {
  const email = validateEmail(values.email);
  return email ? { email } : {};
}

/** The same rules as choosing a password at sign-up, since this is choosing one. */
export function validateReset(values: ResetValues): FieldErrors<ResetValues> {
  const errors: FieldErrors<ResetValues> = {};
  const password = validatePassword(values.password);
  if (password) {
    errors.password = password;
  } else {
    const confirmation = confirmationError(values.password, values.confirmPassword);
    if (confirmation) errors.confirmPassword = confirmation;
  }
  return errors;
}
