import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import { getFirebaseAuthErrorMessage, isAdminEmail } from "./authAccess";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  isAdmin: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isAdmin = isAdminEmail(user?.email);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (!user) {
        setAccessToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email?: string, password?: string) => {
    if (typeof email !== "string" || !password) {
      await signInWithGoogle();
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Sign in failed", error);
      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset failed", error);
      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive");
    provider.addScope("https://www.googleapis.com/auth/calendar");
    provider.addScope("https://www.googleapis.com/auth/spreadsheets");
    provider.addScope("https://mail.google.com/");
    provider.addScope("https://www.googleapis.com/auth/contacts");
    provider.setCustomParameters({ prompt: "select_account consent" });

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setAccessToken(credential?.accessToken || null);
    } catch (error) {
      console.error("Google sign in failed", error);
      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setAccessToken(null);
  };

  const contextValue = { user, loading, accessToken, isAdmin, signIn, signInWithGoogle, resetPassword, logOut };

  if (loading) return null;

  return (
    <AuthContext.Provider value={contextValue}>
      {user ? children : <FirebaseSignInPanel signIn={signIn} signInWithGoogle={signInWithGoogle} resetPassword={resetPassword} />}
    </AuthContext.Provider>
  );
}

function FirebaseSignInPanel({
  signIn,
  signInWithGoogle,
  resetPassword,
}: {
  signIn: (email?: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleEmailPasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSigningIn(true);

    try {
      await signIn(email.trim(), password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setNotice("");
    setIsGoogleSigningIn(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Google.");
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setError("");
    setNotice("");
    setIsResettingPassword(true);

    try {
      await resetPassword(trimmedEmail);
      setNotice(`Password reset email sent to ${trimmedEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send a password reset email.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-jdt-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-jdt-border bg-jdt-panel p-8 shadow-xl">
        <div className="mx-auto mb-5 rounded-xl border border-jdt-border bg-white p-3">
          <img src="/jd-thornton-logo.png" alt="JD Thornton Nurseries" className="mx-auto h-32 w-full object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-jdt-primary">JDT Command Center</h1>
          <p className="mt-2 text-sm font-bold text-zinc-500">Sign in with Google or your Firebase email and password.</p>
        </div>

        <form onSubmit={handleEmailPasswordSignIn} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2.5 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
              placeholder="name@jdtnurseries.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2.5 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
              placeholder="Password"
            />
          </label>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{error}</p>}
          {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-800">{notice}</p>}

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full rounded-lg bg-jdt-primary px-4 py-3 text-sm font-black uppercase text-white transition-colors hover:bg-jdt-dark disabled:cursor-wait disabled:opacity-70"
          >
            {isSigningIn ? "Signing In" : "Sign In With Email"}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-jdt-border" />
            <span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Or</span>
            <span className="h-px flex-1 bg-jdt-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSigningIn}
            className="w-full rounded-lg border border-jdt-border bg-white px-4 py-3 text-sm font-black uppercase text-jdt-text transition-colors hover:border-jdt-olive disabled:cursor-wait disabled:opacity-70"
          >
            {isGoogleSigningIn ? "Opening Google" : "Sign In With Google"}
          </button>

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isResettingPassword}
            className="w-full rounded-lg border border-jdt-border bg-white px-4 py-2.5 text-xs font-black uppercase text-jdt-text transition-colors hover:border-jdt-olive disabled:cursor-wait disabled:opacity-70"
          >
            {isResettingPassword ? "Sending Reset" : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
