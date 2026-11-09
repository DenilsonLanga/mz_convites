import { notFound } from "next/navigation";
import { getPublicInvitation } from "@/lib/public-invitation";
import { Invitation } from "@/components/invitation";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function GuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getPublicInvitation(token);
  if (!invitation) notFound();
  return (
    <main
      className="guest-page"
      style={{ background: invitation.content!.background }}
    >
      <Invitation content={invitation.content!} recipient={invitation.name} />
      <footer className="guest-footer">COM AMOR, MZ CONVITES</footer>
    </main>
  );
}
