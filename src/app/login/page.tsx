import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listTeamMembers } from "@/lib/db";
import { loginAction } from "@/app/actions";
import MemberLoginButton from "@/components/MemberLoginButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; memberId?: string }>;
}) {
  const current = await getCurrentUser();
  if (current) redirect("/");

  const { erro, memberId } = await searchParams;
  const members = await listTeamMembers(true);

  return (
    <div
      className="relative flex-1 flex items-start justify-center lg:items-start lg:justify-start bg-bege bg-cover bg-center bg-no-repeat px-4 pt-32 pb-10 sm:px-8 sm:pt-36 lg:px-[6%] lg:pt-[41vh]"
      style={{ backgroundImage: "url(/login-bg.svg)" }}
    >
      <div className="w-full max-w-md">
        {erro === "senha" && (
          <div className="mb-4 rounded-xl bg-[#fde6e0] border border-[#f7c6bb] px-4 py-3 text-sm text-vermelho text-center">
            Senha incorreta. Tente novamente.
          </div>
        )}
        {erro === "invalido" && (
          <div className="mb-4 rounded-xl bg-[#fde6e0] border border-[#f7c6bb] px-4 py-3 text-sm text-vermelho text-center">
            Usuário inválido.
          </div>
        )}

        <div className="rounded-2xl border border-[#ecd9c7] bg-white shadow-sm p-4 sm:p-6">
          {members.length === 0 ? (
            <p className="text-sm text-[#7a716a] text-center py-6">
              Nenhuma pessoa cadastrada ainda. Peça para o administrador cadastrar seu nome.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
              {members.map((m) => (
                <MemberLoginButton
                  key={m.id}
                  id={m.id}
                  name={m.name}
                  isAdmin={m.role === "admin"}
                  hasPassword={!!m.password}
                  autoOpen={erro === "senha" && memberId === m.id}
                  action={loginAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
