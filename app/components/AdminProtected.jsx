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

      try {
        // Check if user has admin role using Cognito custom attributes
        if (user.role === "admin") {
          setIsAdmin(true);
        } else {
          setError("You do not have permission to access this page.");
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setError("Error verifying permissions");
      } finally {
        setIsChecking(false);
      }
    };

    if (!userLoading) {
      checkAdmin();
    }
  }, [user, userLoading, router]);

  if (userLoading || isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
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
          p: 4,
        }}
      >
        <Alert severity="error" sx={{ mb: 3, width: "100%", maxWidth: 500 }}>
          {error}
        </Alert>
        <Typography variant="body1" sx={{ mb: 3 }}>
          You need administrator privileges to access this page.
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push("/property-view")}
          sx={{
            bgcolor: "#eccb34",
            color: "#333",
            "&:hover": { bgcolor: "#d4b62c" },
          }}
        >
          Go to Property View
        </Button>
      </Box>
    );
  }

  return isAdmin ? children : null;
}
