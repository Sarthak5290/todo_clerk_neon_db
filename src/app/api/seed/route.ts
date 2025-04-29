// app/api/seed/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, email } = await request.json();
  const user = await prisma.user.create({
    data: {
      id: `user-${Date.now()}`,
      name,
      email,
    },
  });
  return NextResponse.json(user, { status: 201 });
}
