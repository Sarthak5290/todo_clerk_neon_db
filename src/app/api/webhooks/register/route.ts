// src/app/api/webhooks/register/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing WEBHOOK_SECRET");
    return new Response("Webhook secret not set", { status: 500 });
  }

  // In Next.js 15.3.0, headers() returns a Promise<ReadonlyHeaders>
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing required svix headers");
    return new Response("Missing headers", { status: 400 });
  }

  // Log headers for debugging
  console.log("Headers received:", {
    svix_id,
    svix_timestamp,
    svix_signature: svix_signature.substring(0, 10) + "...", // Truncate for security
  });

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Log payload for debugging (be careful with sensitive data)
  console.log("Webhook payload type:", payload.type);

  let event: WebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;

    console.log("Webhook verification successful");
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "user.created":
        const userData = event.data as {
          id: string;
          email_addresses: { id: string; email_address: string }[];
          primary_email_address_id: string;
          first_name: string | null;
          last_name: string | null;
        };

        console.log(`User created event for ID: ${userData.id}`);
        await handleUserCreated(userData);
        break;

      default:
        console.log(`Skipping unhandled webhook event type: ${event.type}`);
    }

    console.log("Webhook processing completed successfully");
    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}

async function handleUserCreated(data: {
  id: string;
  email_addresses: { id: string; email_address: string }[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
}) {
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  );

  const emailAddress = primaryEmail?.email_address;
  console.log(`Primary email found: ${emailAddress}`);

  const name =
    [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
  console.log(`Formatted name: ${name}`);

  try {
    console.log("Attempting to create user in database...");
    const newUser = await prisma.user.create({
      data: {
        id: data.id,
        email: emailAddress,
        name,
        isSubscribe: false,
      },
    });
    console.log(`User successfully created in database: ${newUser.id}`);
    return newUser;
  } catch (error) {
    console.error("Error creating user in database:", error);
    // Log more specific error details
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    throw error;
  }
}
