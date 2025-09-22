"use client";

import { Amplify } from "aws-amplify";

export const configureAmplify = () => {
  // Add explicit logging
  console.log("Configuring Amplify with environment variables:", {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    redirectSignIn: process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN,
    redirectSignOut: process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT,
  });

  // Configure with explicit values for all OAuth parameters
  Amplify.configure({
    Auth: {
      Cognito: {
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
          scope: ["email", "profile", "openid"],
          redirectSignIn: process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN,
          redirectSignOut: process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT,
          responseType: "code",
          providers: ["Google"],
        },
      },
    },
  });

  return Amplify.getConfig();
};
