"use client";

import { useUser } from "@/contexts/UserContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { CircularProgress } from "@mui/material";

export default function UserProtected({ children }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      console.log("No user, redirecting to /login from:", pathname);
      router.push("/login");
    }
  }, [user, loading, router, pathname]);

  if (loading) {
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

  return user || pathname === "/login" ? children : null;
}
