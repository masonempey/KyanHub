"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { TextField, Button, Typography, Paper, Alert } from "@mui/material";
import { styled } from "@mui/system";
import styles from "../styles/login.module.css";
import axios from "axios";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/register`,
        {
          email,
          password,
        }
      );
      console.log("User created:", res.data);
      router.push("/analytics");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      console.log(res);
      setEmail("");
      setPassword("");
      setError("");
      if (res) {
        router.push("/analytics");
      }
    } catch (error) {
      setError(error.message);
    }
  };

  // handle google sign in if user is not exist, create new user in firebase auth and mongoDB
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if the user exists in backend
      const checkUserResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/validate`,
        {
          uid: user.uid,
        }
      );

      if (!checkUserResponse.data.exists) {
        // Create the user in the backend first
        const backendResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/googleregister`,
          {
            email: user.email,
            uid: user.uid,
          }
        );

        if (backendResponse.status !== 201) {
          throw new Error("Failed to create user in backend");
        }
      }

      // Lookup user in Firebase
      await lookupUser();
      if (checkUserResponse.data.exists) {
        router.push("/add");
      } else {
        throw new Error("Failed to find user in database");
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setError(
        error.response?.data?.message ||
          "Failed to sign in with Google. Please try again."
      );
    }
  };

  const lookupUser = async () => {
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
        {
          idToken,
        }
      );
      console.log("User lookup response:", response.data);
    } catch (error) {
      console.error(
        "Error looking up user:",
        error.response?.data || error.message
      );
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
            fontStyle: "Bold",
            color: "#eccb34",
          }}
        >
          {isLogin ? "Login" : "Sign Up"}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#eccb34",
              },
              "&:hover fieldset": {
                borderColor: "#eccb34",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#eccb34",
              },
            },
            "& .MuiInputLabel-root": {
              color: "#eccb34",
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#eccb34",
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
          sx={{
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#eccb34",
              },
              "&:hover fieldset": {
                borderColor: "#eccb34",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#eccb34",
              },
            },
            "& .MuiInputLabel-root": {
              color: "#eccb34",
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#eccb34",
            },
          }}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={isLogin ? handleLogin : handleSignUp}
          sx={{
            mt: 2,
            backgroundColor: "#eccb34",
            color: "#fafafa",
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
            "&:hover": {
              backgroundColor: "#2b2b2b",
            },
          }}
        >
          {isLogin ? "Login" : "Sign Up"}
        </Button>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => setIsLogin(!isLogin)}
          sx={{
            mt: 2,
            backgroundColor: "#eccb34",
            color: "#fafafa",
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
            "&:hover": {
              backgroundColor: "#2b2b2b",
            },
          }}
        >
          {isLogin ? "Sign Up" : "Login"}
        </Button>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleGoogleSignIn}
          sx={{
            mt: 2,
            backgroundColor: "#eccb34",
            color: "#fafafa",
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
            "&:hover": {
              backgroundColor: "#2b2b2b",
            },
          }}
        >
          Sign in with Google
        </Button>
      </FormContainer>
    </div>
  );
};

export default Login;
