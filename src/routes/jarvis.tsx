import { createFileRoute } from "@tanstack/react-router";
import { JarvisPage } from "@/pages/jarvis-page";

export const Route = createFileRoute("/jarvis")({ component: JarvisPage });
