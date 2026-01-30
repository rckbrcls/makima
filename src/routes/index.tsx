import { createFileRoute } from "@tanstack/react-router"
import { AgentsPage } from "@/pages/agents-page"

export const Route = createFileRoute("/")({ component: AgentsPage })
