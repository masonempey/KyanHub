// app/api/auth/verify/route.js
import crypto from "crypto";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

function calculateSecretHash(username, clientId, clientSecret) {
  const message = username + clientId;
  const hmac = crypto.createHmac("SHA256", clientSecret);
  return hmac.update(message).digest("base64");
}

export async function POST(request) {
  const { username, confirmationCode, password } = await request.json();

  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;
  const region = process.env.AWS_REGION;

  const client = new CognitoIdentityProviderClient({ region });

  try {
    // Step 1: Confirm the signup
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: username,
      ConfirmationCode: confirmationCode,
      SecretHash: calculateSecretHash(username, clientId, clientSecret),
    });

    await client.send(confirmCommand);

    // Step 2: If password is provided, automatically sign in the user
    if (password) {
      const signInCommand = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: calculateSecretHash(username, clientId, clientSecret),
        },
      });

      const signInResponse = await client.send(signInCommand);

      return Response.json({
        success: true,
        message: "User confirmed and signed in successfully",
        tokens: {
          accessToken: signInResponse.AuthenticationResult.AccessToken,
          idToken: signInResponse.AuthenticationResult.IdToken,
          refreshToken: signInResponse.AuthenticationResult.RefreshToken,
        },
      });
    }

    return Response.json({
      success: true,
      message: "User confirmed successfully",
    });
  } catch (error) {
    console.error("Confirmation error:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 400 }
    );
  }
}
