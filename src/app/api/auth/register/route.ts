import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { JOB_CATEGORIES } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, businessName, specialties, city, state, zipCode, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    if (role === "contractor") {
      // Seed job categories if they don't exist
      for (const cat of JOB_CATEGORIES) {
        await prisma.jobCategory.upsert({
          where: { name: cat.name },
          update: {},
          create: {
            id: cat.id,
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            baseMinPrice: cat.baseMinPrice,
            baseMaxPrice: cat.baseMaxPrice,
            unit: cat.unit,
          },
        });
      }

      await prisma.contractor.create({
        data: {
          userId: user.id,
          businessName: businessName || name,
          phone: phone || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          specialties: JSON.stringify(specialties || []),
        },
      });
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
