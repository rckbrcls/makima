import { createFileRoute } from "@tanstack/react-router"
import { CommandHub } from "@/components/command-hub"

export const Route = createFileRoute("/")({ component: App })

function App() {
  return <CommandHub />
}
