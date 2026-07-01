import RtbCampaignForm from "@/components/campaigns/rtb-campaign-form";
import { getServerSession } from "@/lib/supabase/server";

export default async function NewRtbCampaignPage() {
  const session = await getServerSession();
  const workspaceId = session?.workspace.id ?? "";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Nova Campanha Programática</h1>
      <RtbCampaignForm workspaceId={workspaceId} />
    </div>
  );
}
