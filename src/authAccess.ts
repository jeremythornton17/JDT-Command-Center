const ADMIN_DOMAIN = "jdtnurseries.com";
const OWNER_EMAIL = `jeremy@${ADMIN_DOMAIN}`;

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail === OWNER_EMAIL || normalizedEmail.endsWith(`@${ADMIN_DOMAIN}`);
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "That email and password did not match a Firebase user.";
    case "auth/too-many-requests":
      return "Firebase temporarily blocked sign-in attempts. Try again shortly or reset the password.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished.";
    case "auth/popup-blocked":
      return "The browser blocked the Google sign-in window. Allow popups for this site and try again.";
    case "auth/account-exists-with-different-credential":
      return "That email already uses another Firebase sign-in method.";
    default:
      return "Unable to sign in. Check the account in Firebase Authentication and try again.";
  }
}
