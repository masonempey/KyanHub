"use client";

import { useEffect } from "react";
import { configureAmplify } from "@/lib/amplify/config";

export default function AmplifyConfig({ children }) {
  useEffect(() => {
    configureAmplify();
  }, []);

  return <>{children}</>;
}
