import { createFileRoute } from "@tanstack/react-router"
import { AgentHub } from "@/components/agent-hub"

export const Route = createFileRoute("/agents")({ component: AgentsPage })

function AgentsPage() {
  return <AgentHub />
}
