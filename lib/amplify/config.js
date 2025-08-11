"use client";

import { Amplify } from "aws-amplify";

export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        region: process.env.NEXT_PUBLIC_AWS_REGION || "ca-central-1",
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
        signUpVerificationMethod: "code",
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN.replace(
            "https://",
            ""
          ),
          scope: ["email", "profile", "openid"],
          redirectSignIn: process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN.split(","),
          redirectSignOut: process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT.split(","),
          responseType: "code",
        },
      },
    },
  });
};
