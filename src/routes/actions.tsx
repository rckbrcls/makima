import { createFileRoute } from "@tanstack/react-router"
import { ActionsPage } from "@/pages/actions-page"

export const Route = createFileRoute("/actions")({ component: ActionsPage })
