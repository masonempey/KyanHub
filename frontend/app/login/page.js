"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { TextField, Button, Typography, Paper, Alert } from "@mui/material";
import { styled } from "@mui/system";
import styles from "../styles/login.module.css";
import axios from "axios";

const FormContainer = styled(Paper)({
  padding: "2rem",
  maxWidth: "400px",
  width: "100%",
  backgroundColor: "#fafafa",
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);

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
      if (res) {
        window.location.href = "/";
      }
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
        window.location.href = "/";
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
        await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/googleregister`,
          {
            email: user.email,
            uid: user.uid,
            name: user.displayName || user.email,
          }
        );
      }

      // Redirect to home or another page
      window.location.href = "/";
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setError(
        error.response?.data?.message ||
          "Failed to sign in with Google. Please try again."
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
            fontStyle: "normal",
            color: "#35281f",
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
                borderColor: "#35281f",
              },
              "&:hover fieldset": {
                borderColor: "#35281f",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#35281f",
              },
            },
            "& .MuiInputLabel-root": {
              color: "#35281f",
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#35281f",
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
                borderColor: "#35281f",
              },
              "&:hover fieldset": {
                borderColor: "#35281f",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#35281f",
              },
            },
            "& .MuiInputLabel-root": {
              color: "#35281f",
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#35281f",
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
            backgroundColor: "#35281f",
            color: "#fafafa",
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
          }}
        >
          {isLogin ? "Login" : "Sign Up"}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={() => setIsLogin(!isLogin)}
          sx={{
            mt: 2,
            borderColor: "#35281f",
            color: "#35281f",
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
          }}
        >
          {isLogin ? "Sign Up" : "Login"}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={handleGoogleSignIn}
          sx={{
            mt: 2,
            backgroundColor: "#fafafa",
            color: "#35281f",
            border: "1px solid #35281f",
            fontFamily: "Lato",
            fontWeight: 800,
            fontStyle: "normal",
          }}
        >
          Sign in with Google
        </Button>
      </FormContainer>
    </div>
  );
};

export default Login;
