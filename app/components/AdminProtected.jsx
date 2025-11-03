"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import CircularProgress from "@mui/material/CircularProgress";
import fetchWithAuth from "@/lib/fetchWithAuth";
import { Alert, Box, Typography, Button } from "@mui/material";

export default function AdminProtected({ children }) {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      // Temporarily bypass admin check
      setIsAdmin(true);
      setIsChecking(false);

      // Comment out or remove the original admin check code
      /*
      try {
        const response = await fetchWithAuth("/api/admin");
        if (!response.ok) {...}
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {...}
        if (!data.success) {...}
        setIsAdmin(true);
      } catch (error) {...}
      */
    };

    if (!userLoading) {
      checkAdmin();
    }
  }, [user, userLoading, router]);

  if (userLoading || isChecking) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 2,
          p: 3,
        }}
      >
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: "#2b2b2b",
            color: "#fafafa",
            "& .MuiAlert-icon": {
              color: "#eccb34",
            },
          }}
        >
          {error}
        </Alert>
        <Typography variant="body1" sx={{ color: "#fafafa" }}>
          Please contact an administrator for access.
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push("/login")}
          sx={{
            mt: 2,
            backgroundColor: "#eccb34",
            color: "#fafafa",
            "&:hover": { backgroundColor: "#2b2b2b" },
          }}
        >
          Return to Log In & Contact Admin
        </Button>
      </Box>
    );
  }

  return isAdmin ? children : null;
}
