"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function useAuth() {
  const { address, isConnected } = useWallet();

  const [authState, setAuthState] = useState<AuthState>(() =>
    loadToken() ? "authenticated" : "unauthenticated"
  );
  const [token, setToken] = useState<string | null>(() => loadToken());

  const { signMessageAsync } = useSignMessage();

  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (isConnected) {
      hasConnectedRef.current = true;
    } else if (hasConnectedRef.current) {

      clearToken();
      setToken(null);
      setAuthState("unauthenticated");
    }
  }, [isConnected]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setAuthState("signing");

    try {

      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      const { message } = await nonceRes.json();

      const signature = await signMessageAsync({ message });

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
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers ?? {}),
          Authorization: jwt ? `Bearer ${jwt}` : "",
        },
      });

      // Token expired — clear it and re-auth transparently, then retry once
      if (res.status === 401) {
        clearToken();
        setToken(null);
        setAuthState("unauthenticated");
        await signIn();
        const freshJwt = loadToken();
        return fetch(url, {
          ...options,
          headers: {
            ...(options.headers ?? {}),
            Authorization: freshJwt ? `Bearer ${freshJwt}` : "",
          },
        });
      }

      return res;
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
