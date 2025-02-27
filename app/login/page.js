"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { TextField, Button, Typography, Paper, Alert } from "@mui/material";
import { styled } from "@mui/system";
import styles from "./Login.module.css";
import { useRouter } from "next/navigation";
import fetchWithAuth from "@/lib/fetchWithAuth";

const FormContainer = styled(Paper)({
  padding: "2rem",
  maxWidth: "20vw",
  width: "100vw",
  backgroundColor: "#fafafa",
});

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
        // Updated to match existing route
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
        // Updated to match existing route
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: userCredential.user.uid }), // Send uid as expected by route
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
      console.log("Google sign-in successful, token:", idToken);

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
      console.log("Google register response:", data);

      console.log("Redirecting to /property-management...");
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
    <div className={styles.container}>
      <FormContainer elevation={3}>
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{
            fontFamily: "Lato",
            fontWeight: 800,
            color: "#eccb34",
          }}
        >
          {isLogin ? "Login" : "Sign Up"}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputLabel-root": {
              color: "#eccb34",
              "&.Mui-focused": { color: "#eccb34" },
            },
          }}
        />
        <TextField
          label="Password"
          variant="outlined"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputLabel-root": {
              color: "#eccb34",
              "&.Mui-focused": { color: "#eccb34" },
            },
          }}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={isLogin ? handleLogin : handleSignUp}
          disabled={isLoading}
          sx={{
            mt: 2,
            backgroundColor: "#eccb34",
            color: "#fafafa",
            "&:hover": { backgroundColor: "#2b2b2b" },
          }}
        >
          {isLoading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
        </Button>
        <Button
          variant="text"
          fullWidth
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
          }}
          disabled={isLoading}
          sx={{
            mt: 2,
            color: "#eccb34",
            "&:hover": { backgroundColor: "rgba(236, 203, 52, 0.1)" },
          }}
        >
          {isLogin
            ? "Need an account? Sign Up"
            : "Already have an account? Login"}
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          sx={{
            mt: 2,
            backgroundColor: "#eccb34",
            color: "#fafafa",
            "&:hover": { backgroundColor: "#2b2b2b" },
          }}
        >
          {isLoading ? "Processing..." : "Sign in with Google"}
        </Button>
      </FormContainer>
    </div>
  );
};

export default Login;
