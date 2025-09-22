"use client";

import { useEffect, useState } from "react";
import { Hub } from "aws-amplify/utils";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";

export default function HandleCallbackOnload() {
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Handle any OAuth redirect
    if (
      window.location.pathname === "/login" &&
      (window.location.hash || window.location.search.includes("code="))
    ) {
      setIsProcessingRedirect(true);
    }

    // Listen for auth events
    const listener = Hub.listen("auth", ({ payload }) => {
      const { event } = payload;

      if (event === "signedIn") {
        // User is signed in, redirect to home
        router.push("/property-management");
      } else if (event === "signInWithRedirect") {
        // Processing the redirect
        setIsProcessingRedirect(true);
      } else if (event === "signInWithRedirect_failure") {
        // Handle failure
        console.error("Sign-in redirect failed:", payload.data);
        setIsProcessingRedirect(false);
      } else if (event === "customOAuthState") {
        // Custom OAuth state if you're using it
        console.log("Custom OAuth state:", payload.data);
      }
    });

    return () => {
      listener();
    };
  }, [router]);

  // Show loading indicator if processing redirect
  if (isProcessingRedirect) {
    return (
      <div className="flex items-center justify-center h-screen">
        <CircularProgress sx={{ color: "#eccb34" }} />
        <p className="ml-2">Processing sign-in...</p>
      </div>
    );
  }

  // Return null if not processing redirect
  return null;
}
