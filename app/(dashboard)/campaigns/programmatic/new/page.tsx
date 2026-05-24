import RtbCampaignForm from "@/components/campaigns/rtb-campaign-form";

export default function NewRtbCampaignPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Nova Campanha Programática</h1>
      <RtbCampaignForm />
    </div>
  );
}
