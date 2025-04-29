// src/app/api/webhooks/register/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Add a GET handler to respond to verification requests
export async function GET() {
  console.log("GET request received at webhook endpoint");
  return new Response(
    "Webhook endpoint is alive. Use POST for webhook events.",
    {
      status: 200,
    }
  );
}

export async function POST(req: Request) {
  console.log("Webhook endpoint POST called");

  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing WEBHOOK_SECRET");
    return new Response("Webhook secret not set", { status: 500 });
  }

  try {
    // In Next.js 15.3.0, headers() returns a Promise<ReadonlyHeaders>
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Missing required svix headers");
      return new Response("Missing headers", { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Log payload for debugging
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
      console.log(event);
    } catch (error) {
      console.error("Error verifying webhook:", error);
      return new Response("Invalid signature", { status: 400 });
    }

    try {
      console.log(`Processing webhook event: ${event.type}`);

      if (event.type === "user.created") {
        const userData = event.data as {
          id: string;
          email_addresses: { id: string; email_address: string }[];
          primary_email_address_id: string;
          first_name: string | null;
          last_name: string | null;
        };

        console.log(`User created event for ID: ${userData.id}`);

        const newUswer = await prisma.user.create({
          data: {
            id: userData.id,
            email: userData.email_addresses[0].email_address,
            name:
              [userData.first_name, userData.last_name]
                .filter(Boolean)
                .join(" ") || null,
            isSubscribe: false,
          },
        });

        console.log(`User created in database: ${newUswer}`);
      } else {
        console.log(`Skipping unhandled webhook event type: ${event.type}`);
      }

      console.log("Webhook processing completed successfully");
      return new Response("Webhook processed successfully", { status: 200 });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  } catch (error) {
    console.error("Top-level error in webhook handler:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
