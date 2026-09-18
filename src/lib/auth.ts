import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "base-hris-enterprise-super-secret-key-2026"
);

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  companyId: string | null;
  companyName?: string;
  companyCode?: string;
  roles: string[];
  permissions: string[];
  employeeId?: string;
  employeeNumber?: string;
}

export async function signAuthToken(payload: AuthSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyAuthToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession;
  } catch (err) {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("base_session_token")?.value;
  if (!token) return null;
  return await verifyAuthToken(token);
}

export async function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set("base_session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.set("base_session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getUserFullContext(userId: string): Promise<AuthSession | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      company: {
        include: {
          branding: true,
        },
      },
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      employee: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  const roleNames = user.roles.map((ur) => ur.role.name);
  const permissionSet = new Set<string>();

  for (const ur of user.roles) {
    for (const rp of ur.role.permissions) {
      permissionSet.add(rp.permission.code);
    }
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    companyId: user.companyId,
    companyName: user.company?.name,
    companyCode: user.company?.code,
    roles: roleNames,
    permissions: Array.from(permissionSet),
    employeeId: user.employee?.id,
    employeeNumber: user.employee?.employeeIdNumber,
  };
}