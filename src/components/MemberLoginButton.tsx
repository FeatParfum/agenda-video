"use client";

import { useState } from "react";

export default function MemberLoginButton({
  id,
  name,
  isAdmin,
  hasPassword,
  autoOpen,
  action,
}: {
  id: string;
  name: string;
  isAdmin: boolean;
  hasPassword: boolean;
  autoOpen?: boolean;
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(!!autoOpen);

  if (!hasPassword) {
    return (
      <form action={action}>
        <input type="hidden" name="memberId" value={id} />
        <button
          type="submit"
          className="w-full rounded-xl border border-[#ece3d8] px-4 py-3 text-left font-semibold text-preto hover:border-laranja hover:bg-bege transition-colors"
        >
          {name}
          {isAdmin && <span className="ml-2 text-xs font-normal text-laranja">admin</span>}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-[#ece3d8] overflow-hidden">
      <input type="hidden" name="memberId" value={id} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 text-left font-semibold text-preto hover:bg-bege transition-colors"
      >
        {name}
        {isAdmin && <span className="ml-2 text-xs font-normal text-laranja">admin</span>}
      </button>
      {open && (
        <div className="px-4 pb-3 flex gap-2">
          <input
            type="password"
            name="password"
            placeholder="Senha"
            autoFocus
            className="flex-1 rounded-lg border border-[#ece3d8] px-3 py-2 text-sm focus:border-laranja focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-laranja px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Entrar
          </button>
        </div>
      )}
    </form>
  );
}
