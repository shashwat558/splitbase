"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { useWallet } from "./useWallet";

type AuthState = "unauthenticated" | "signing" | "authenticated" | "error";

const TOKEN_KEY = "splitbase_jwt";

function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

/**
 * Manages SIWE (Sign-In with Ethereum) session.
 * Auto-signs in when wallet connects.
 * Returns `authFetch` — a fetch wrapper that attaches the JWT.
 */
export function useAuth() {
  const { address, isConnected } = useWallet();

  // ── Initialize synchronously from localStorage to avoid the race condition
  // where both effects see initial state before the "load token" effect runs.
  const [authState, setAuthState] = useState<AuthState>(() =>
    loadToken() ? "authenticated" : "unauthenticated"
  );
  const [token, setToken] = useState<string | null>(() => loadToken());

  const { signMessageAsync } = useSignMessage();

  // When wallet disconnects, clear session
  useEffect(() => {
    if (!isConnected) {
      clearToken();
      setToken(null);
      setAuthState("unauthenticated");
    }
  }, [isConnected]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setAuthState("signing");

    try {
      // 1. Get the message to sign
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      const { message } = await nonceRes.json();

      // 2. Ask wallet to sign
      const signature = await signMessageAsync({ message });

      // 3. Verify and get JWT
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      if (!verifyRes.ok) throw new Error("Signature verification failed");

      const { token: jwt } = await verifyRes.json();
      saveToken(jwt);
      setToken(jwt);
      setAuthState("authenticated");
    } catch (err) {
      console.error("SIWE sign-in failed:", err);
      setAuthState("error");
    }
  }, [address, signMessageAsync]);

  // Auto sign-in when wallet connects and no token exists
  useEffect(() => {
    if (isConnected && address && !token && authState === "unauthenticated") {
      signIn();
    }
  }, [isConnected, address, token, authState, signIn]);

  /**
   * Authenticated fetch — attaches the JWT as a Bearer token.
   * Falls back to sign-in if token is missing.
   */
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const currentToken = token ?? loadToken();
      if (!currentToken) {
        await signIn();
      }

      const jwt = token ?? loadToken();
      return fetch(url, {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          Authorization: jwt ? `Bearer ${jwt}` : "",
        },
      });
    },
    [token, signIn]
  );

  return {
    isAuthenticated: authState === "authenticated",
    isSigning: authState === "signing",
    authState,
    token,
    signIn,
    authFetch,
  };
}
