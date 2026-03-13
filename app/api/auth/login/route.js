
import { NextResponse } from "next/server";
import { getUserByLogin } from "../../../../lib/rolesSheets";
import { setSessionCookie } from "../../../../lib/auth";

export async function POST(req) {
  try {
    const { login, password } = await req.json();

    const user = await getUserByLogin(login);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    // Простая проверка пароля (без хэша)
    if (String(user.password || "") !== String(password || "")) {
      return NextResponse.json(
        { ok: false, error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    await setSessionCookie({
      login: user.login,
      role: user.role,
      full_name: user.full_name || ""
    });

    return NextResponse.json({
      ok: true,
      user: {
        login: user.login,
        role: user.role,
        full_name: user.full_name || ""
      }
    });

  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 }
    );
  }
}
