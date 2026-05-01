"use client";

import { WorkflowTanks } from "@/components/WorkflowTanks";
import {
  type WorkflowTankData,
  workflowRowId,
} from "@/lib/readiness/workflow-tanks";

export function WorkflowTanksNavigator({
  workflows,
}: {
  workflows: WorkflowTankData[];
}) {
  function handleScrollToWorkflow(workflowId: string) {
    const row = document.getElementById(workflowRowId(workflowId));

    if (!row) {
      return;
    }

    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.remove("workflow-row-highlight");
    window.setTimeout(() => {
      row.classList.add("workflow-row-highlight");
      window.setTimeout(
        () => row.classList.remove("workflow-row-highlight"),
        2000,
      );
    }, 120);
  }

  return (
    <WorkflowTanks
      onTankClick={handleScrollToWorkflow}
      showLabels
      size="lg"
      workflows={workflows}
    />
  );
}
