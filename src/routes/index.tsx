import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/pages/workspace-page";

export const Route = createFileRoute("/")({ component: WorkspacePage });
