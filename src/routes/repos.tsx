import { createFileRoute } from "@tanstack/react-router"
import { ReposPage } from "@/pages/repos-page"

export const Route = createFileRoute("/repos")({ component: ReposPage })
