import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signAuthToken, setAuthCookie, getUserFullContext } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Akun Anda berstatus non-aktif. Hubungi HR." }, { status: 403 });
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionPayload = await getUserFullContext(user.id);
    if (!sessionPayload) {
      return NextResponse.json({ error: "Gagal memuat profil pengguna." }, { status: 500 });
    }

    const token = await signAuthToken(sessionPayload);
    await setAuthCookie(token);

    // Record audit log
    await recordAuditLog({
      companyId: user.companyId,
      userId: user.id,
      module: "AUTH",
      action: "LOGIN",
      recordId: user.id,
    });

    return NextResponse.json({
      success: true,
      user: sessionPayload,
    });
  } catch (err: any) {
    console.error("Login API Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}