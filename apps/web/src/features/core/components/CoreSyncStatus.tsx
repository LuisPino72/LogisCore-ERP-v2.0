import { useCore } from "../hooks/useCore";
import { coreService } from "../services/core.service.instance";

export function CoreSyncStatus() {
  const { state } = useCore({ service: coreService });
  return (
    <section
      style={{
        marginTop: "16px",
        background: "#e2e8f0",
        borderRadius: "8px",
        padding: "12px"
      }}
    >
      <strong>Estado Sync:</strong>
      {" "}
      {state.syncStatus}
    </section>
  );
}
