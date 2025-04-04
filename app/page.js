"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../contexts/UserContext";
import { useProperties } from "../contexts/PropertyContext";

const HomePage = () => {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { loading: propertiesLoading } = useProperties();

  useEffect(() => {
    if (!userLoading && !propertiesLoading) {
      if (user) {
        router.push("/property-management");
      } else {
        router.push("/login");
      }
    }
  }, [router, user, userLoading, propertiesLoading]);

  if (userLoading || propertiesLoading) {
    return <div>Loading...</div>;
  }

  return null; // No content needed since we redirect
};

export default HomePage;
