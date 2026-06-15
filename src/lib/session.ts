import { cookies } from "next/headers";
import { getTeamMemberById } from "./db";
import { SESSION_COOKIE } from "./constants";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = await getTeamMemberById(id);
  if (!user || !user.active) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("NOT_AUTHENTICATED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("NOT_ADMIN");
  }
  return user;
}
