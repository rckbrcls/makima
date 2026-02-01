import { createFileRoute } from "@tanstack/react-router"
import { AgentsBuilderPage } from "@/pages/agents-builder-page"

export const Route = createFileRoute("/agents")({ component: AgentsBuilderPage })
