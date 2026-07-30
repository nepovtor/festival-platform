import { NextResponse } from "next/server";
import { adminSessionCookie, createAdminSession } from "@/lib/admin-session";

export async function POST(request: Request) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      { message: "Доступ администратора не настроен" },
      { status: 503 },
    );
  }

  let credentials: { username?: unknown; password?: unknown };
  try {
    credentials = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ message: "Некорректный запрос" }, { status: 400 });
  }

  if (
    credentials.username !== expectedUsername ||
    credentials.password !== expectedPassword
  ) {
    return NextResponse.json(
      { message: "Неверный логин или пароль" },
      { status: 401 },
    );
  }

  const session = await createAdminSession();
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: adminSessionCookie,
    value: session.value,
    expires: session.expiresAt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: adminSessionCookie,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    path: "/",
  });
  return response;
}
