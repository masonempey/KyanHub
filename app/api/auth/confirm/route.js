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
  const { username, confirmationCode } = await request.json();

  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

  const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });

  try {
    // Confirm the signup
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: username,
      ConfirmationCode: confirmationCode,
      SecretHash: calculateSecretHash(username, clientId, clientSecret),
    });

    await client.send(confirmCommand);

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
