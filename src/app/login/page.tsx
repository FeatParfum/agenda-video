import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listTeamMembers } from "@/lib/db";
import { loginAction } from "@/app/actions";

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current) redirect("/");

  const members = await listTeamMembers(true);

  return (
    <div className="flex flex-1 items-center justify-center bg-bege px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-preto tracking-tight">
            <span className="text-laranja">Agenda</span> de Gravações
          </h1>
          <p className="mt-2 text-sm text-[#7a716a]">
            Selecione seu nome para entrar. Sem senha.
          </p>
        </div>

        <div className="rounded-2xl border border-[#ecd9c7] bg-white shadow-sm p-4 sm:p-6">
          {members.length === 0 ? (
            <p className="text-sm text-[#7a716a] text-center py-6">
              Nenhuma pessoa cadastrada ainda. Peça para o administrador cadastrar seu nome.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map((m) => (
                <form key={m.id} action={loginAction}>
                  <input type="hidden" name="memberId" value={m.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-[#ece3d8] px-4 py-3 text-left font-semibold text-preto hover:border-laranja hover:bg-bege transition-colors"
                  >
                    {m.name}
                    {m.role === "admin" && (
                      <span className="ml-2 text-xs font-normal text-laranja">admin</span>
                    )}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
