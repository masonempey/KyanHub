// app/api/auth/login/route.js
import crypto from "crypto";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// Helper to calculate secret hash
function calculateSecretHash(username, clientId, clientSecret) {
  const message = username + clientId;
  const hmac = crypto.createHmac("SHA256", clientSecret);
  return hmac.update(message).digest("base64");
}

export async function POST(request) {
  const { username, password } = await request.json();

  const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(
          username,
          process.env.USER_POOL_CLIENT_ID,
          process.env.USER_POOL_CLIENT_SECRET
        ),
      },
    });

    const response = await client.send(command);
    return Response.json({
      success: true,
      tokens: {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 400 }
    );
  }
}
