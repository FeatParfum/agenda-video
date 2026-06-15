import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Agenda de Gravações | UniFatecie",
  description: "Sistema de agendamento de gravações de vídeo",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-preto antialiased">
        {user && <NavBar user={user} />}
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
