"use client";

import React, { useState } from "react";
import { signIn, signInWithRedirect, confirmSignUp } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { configureAmplify } from "@/lib/amplify/config";

// Initialize Amplify
configureAmplify();

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // New states for verification
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const handleSignUp = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: email,
          password,
          email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Instead of auto-login, show verification form
        setNeedsVerification(true);
        setCurrentUser(email);
        setError("");
        setIsLoading(false);
      } else {
        // Check if the error is because the user needs confirmation
        if (data.error && data.error.includes("not confirmed")) {
          setNeedsVerification(true);
          setCurrentUser(email);
          setError("");
          setIsLoading(false);
        } else {
          setError(data.error || "Registration failed");
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode || !currentUser) {
      setError("Verification code is required");
      return;
    }

    setIsLoading(true);
    try {
      // Call your server API instead of directly using Amplify
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          confirmationCode: verificationCode,
          password: password, // Pass the password for auto-login
        }),
      });

      const data = await response.json();

      if (data.success) {
        // If login was handled on the server
        if (data.tokens) {
          // Store tokens for future authenticated requests
          localStorage.setItem("accessToken", data.tokens.accessToken);
          localStorage.setItem("idToken", data.tokens.idToken);
          localStorage.setItem("refreshToken", data.tokens.refreshToken);

          // Update Amplify auth session manually
          const { Hub } = await import("aws-amplify/utils");
          Hub.dispatch("auth", { event: "signInWithRedirect" });

          // Navigate to the dashboard
          router.push("/property-management");
        } else {
          // If no tokens, show success message and redirect to login
          setNeedsVerification(false);
          setIsLogin(true);
          setError("");
          setSuccess("Email verified successfully! Please log in.");
        }
      } else {
        setError(data.error || "Verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setError("Network error. Please try again.");
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store tokens
        localStorage.setItem("accessToken", data.tokens.accessToken);
        localStorage.setItem("idToken", data.tokens.idToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);

        router.push("/property-management");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Need to import this function
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError(error.message || "Failed to sign in with Google.");
      setIsLoading(false);
    }
  };

  // If we need verification, show the verification form
  if (needsVerification) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-transparent">
        <div className="bg-secondary/95 rounded-2xl shadow-lg backdrop-blur-sm overflow-hidden border border-primary/10 p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold text-primary text-center mb-6">
            Verify Your Email
          </h2>

          <p className="text-dark mb-6 text-center">
            We&apos;ve sent a verification code to your email address. Please
            enter it below to confirm your account.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="verificationCode"
                className="block text-sm font-medium text-dark mb-1 ml-1"
              >
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-primary/30 rounded-lg focus:outline-none focus:border-primary bg-white text-dark"
                placeholder="Enter verification code"
              />
            </div>

            <button
              onClick={handleVerification}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-dark hover:text-secondary text-dark font-medium px-6 py-3 rounded-lg shadow-md transition-colors duration-300 mt-2"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </button>

            <button
              onClick={() => {
                setNeedsVerification(false);
                setVerificationCode("");
                setError("");
              }}
              disabled={isLoading}
              className="w-full text-primary hover:bg-primary/5 px-6 py-3 rounded-lg transition-colors duration-300"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original login/signup form
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

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
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
