"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { Alert } from "@mui/material";
import { useRouter } from "next/navigation";
import fetchWithAuth from "@/lib/fetchWithAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      const validateRes = await fetchWithAuth("/api/users/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: userCredential.user.uid }),
      });

      if (!validateRes.ok) {
        const data = await validateRes.json();
        throw new Error(data.message || "User validation failed");
      }

      router.push("/property-management");
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.message?.includes("auth/")
          ? "Invalid email or password"
          : error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetchWithAuth("/api/users/googleregister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: result.user.email,
          uid: result.user.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Google sign-in failed");
      }

      router.push("/property-management");
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError(
        error.message.includes("auth/")
          ? "Authentication failed. Please try again."
          : error.message || "Failed to sign in with Google."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-full bg-transparent">
      <div className="bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10 p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-primary text-center mb-6">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-dark mb-1 ml-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-primary/30 rounded-lg focus:outline-none focus:border-primary bg-white text-dark"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-dark mb-1 ml-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-primary/30 rounded-lg focus:outline-none focus:border-primary bg-white text-dark"
              placeholder="Enter your password"
            />
          </div>

          <button
            onClick={isLogin ? handleLogin : handleSignUp}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-dark hover:text-secondary text-dark font-medium px-6 py-3 rounded-lg shadow-md transition-colors duration-300 mt-2"
          >
            {isLoading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
          </button>

          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            disabled={isLoading}
            className="w-full text-primary hover:bg-primary/5 px-6 py-3 rounded-lg transition-colors duration-300"
          >
            {isLogin
              ? "Need an account? Sign Up"
              : "Already have an account? Login"}
          </button>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-dark hover:text-secondary text-dark font-medium px-6 py-3 rounded-lg shadow-md transition-colors duration-300"
          >
            {isLoading ? "Processing..." : "Sign in with Google"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
