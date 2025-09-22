// app/api/auth/signup/route.js
import crypto from "crypto";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

function calculateSecretHash(username, clientId, clientSecret) {
  const message = username + clientId;
  const hmac = crypto.createHmac("SHA256", clientSecret);
  return hmac.update(message).digest("base64");
}

export async function POST(request) {
  const { username, password, email } = await request.json();

  const clientId = process.env.USER_POOL_CLIENT_ID;
  const clientSecret = process.env.USER_POOL_CLIENT_SECRET;

  const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });

  try {
    // Step 1: Sign up the user
    const signUpCommand = new SignUpCommand({
      ClientId: clientId,
      Username: username,
      Password: password,
      SecretHash: calculateSecretHash(username, clientId, clientSecret),
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
      ],
    });

    await client.send(signUpCommand);

    // Return success without trying to log in automatically
    return Response.json({
      success: true,
      message:
        "User registered successfully. Please check your email for verification code.",
    });
  } catch (error) {
    console.error("Signup error:", error);

    // If the user already exists but is not confirmed, handle that case
    if (
      error.name === "UsernameExistsException" &&
      error.message.includes("not confirmed")
    ) {
      // Resend confirmation code
      try {
        const resendCommand = new ResendConfirmationCodeCommand({
          ClientId: clientId,
          Username: username,
          SecretHash: calculateSecretHash(username, clientId, clientSecret),
        });

        await client.send(resendCommand);

        return Response.json({
          success: false,
          error:
            "User is not confirmed yet. A new verification code has been sent.",
          needsConfirmation: true,
        });
      } catch (resendError) {
        return Response.json(
          {
            success: false,
            error: resendError.message,
          },
          { status: 400 }
        );
      }
    }

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 400 }
    );
  }
}
