import Link from "next/link";
import type { TeamMember } from "@/lib/db";
import { logoutAction } from "@/app/actions";

export default function NavBar({ user }: { user: TeamMember }) {
  return (
    <header className="border-b border-[#ece3d8] bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="font-display text-lg sm:text-xl text-preto tracking-tight">
          <span className="text-laranja">Agenda</span> de Gravações
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm font-semibold">
          <Link href="/" className="rounded-lg px-3 py-2 hover:bg-bege transition-colors">
            Calendário
          </Link>
          <Link href="/minhas-reservas" className="rounded-lg px-3 py-2 hover:bg-bege transition-colors">
            Minhas reservas
          </Link>
          {user.role === "admin" && (
            <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-bege transition-colors">
              Admin
            </Link>
          )}
          <div className="ml-1 sm:ml-3 flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#ece3d8]">
            <span className="hidden sm:inline text-[#7a716a]">{user.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-[#7a716a] hover:text-vermelho hover:bg-bege transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </nav>
      </div>
    </header>
  );
}
