"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = { pixelId: string; appUrl?: string };

export function PixelSnippet({ pixelId, appUrl = "https://app.adflow.com.br" }: Props) {
  const [copied, setCopied] = useState(false);

  const snippet = `<!-- AdFlow Pixel -->
<script>
  window.__ADFLOW_PIXEL_ID = "${pixelId}";
  window.__ADFLOW_ENDPOINT = "${appUrl}";
</script>
<script src="${appUrl}/adflow.js" async></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4 space-y-2">
      <pre className="text-xs font-mono text-muted overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? "Copiado!" : "Copiar snippet"}
      </Button>
    </div>
  );
}
