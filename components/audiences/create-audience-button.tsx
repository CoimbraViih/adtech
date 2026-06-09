"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateAudienceDialog } from "./create-audience-dialog";

export function CreateAudienceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Nova Audiência
      </Button>
      <CreateAudienceDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
