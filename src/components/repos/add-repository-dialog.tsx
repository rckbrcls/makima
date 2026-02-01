import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  FolderGit2,
  FolderOpen,
  GitBranch,
  Link2,
  RefreshCw,
  Tag,
} from "lucide-react"
import { invoke, isTauri } from "@tauri-apps/api/core"

import { Button } from "@/components/ui/button"
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
  useExpandableScreen,
} from "@/components/ui/expandable-screen"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/sonner"
import type { NewRepositoryInput } from "./types"

interface AddRepositoryDialogProps {
  children: ReactNode
  onAddRepository: (input: NewRepositoryInput) => Promise<boolean> | boolean
}

const defaultBranch = "main"
const isTauriAvailable = () => {
  try {
    return isTauri()
  } catch {
    return false
  }
}

type RepoBranches = {
  current?: string | null
  branches: string[]
}

export function AddRepositoryDialog({
  children,
  onAddRepository,
}: AddRepositoryDialogProps) {
  // We can't easily intercept open change in ExpandableScreen from outside without context,
  // but we can reset form on submit or inside the content component
  return (
    <ExpandableScreen layoutId="add-repository-dialog">
      <ExpandableScreenTrigger>{children}</ExpandableScreenTrigger>
      <ExpandableScreenContent className="bg-background border border-border pt-6">
        <AddRepositoryForm onAddRepository={onAddRepository} />
      </ExpandableScreenContent>
    </ExpandableScreen>
  )
}

function AddRepositoryForm({
  onAddRepository,
}: {
  onAddRepository: (input: NewRepositoryInput) => Promise<boolean> | boolean
}) {
  const { collapse } = useExpandableScreen()
  const id = useId()
  const nameId = `${id}-name`
  const pathId = `${id}-path`
  const branchId = `${id}-branch`
  const techId = `${id}-tech`

  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [branch, setBranch] = useState(defaultBranch)
  const [tech, setTech] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [canPickFolder, setCanPickFolder] = useState(false)

  const branchRef = useRef(branch)
  useEffect(() => {
    branchRef.current = branch
  }, [branch])

  const canSubmit = name.trim().length > 0 && path.trim().length > 0

  const parsedTech = useMemo(() => {
    return tech
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  }, [tech])

  const resetForm = () => {
    setName("")
    setPath("")
    setBranch(defaultBranch)
    setTech("")
    setBranches([])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    const result = await onAddRepository({
      name: name.trim(),
      path: path.trim(),
      branch: branch.trim() || defaultBranch,
      tech: parsedTech,
    })
    setIsSubmitting(false)

    if (result !== false) {
      resetForm()
      collapse()
    }
  }

  useEffect(() => {
    let active = true
    if (!isTauriAvailable()) {
      setCanPickFolder(false)
      return
    }

    import("@tauri-apps/plugin-dialog")
      .then(() => {
        if (active) setCanPickFolder(true)
      })
      .catch(() => {
        if (active) setCanPickFolder(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const trimmed = path.trim()
    if (!trimmed || !isTauriAvailable()) {
      setBranches([])
      return
    }

    let active = true
    setIsLoadingBranches(true)
    const timer = setTimeout(async () => {
      try {
        const result = await invoke<RepoBranches>("makima_repo_branches", {
          path: trimmed,
        })
        if (!active) return
        setBranches(result.branches)

        const current = result.current?.trim()
        if (
          current &&
          (!branchRef.current.trim() || branchRef.current === defaultBranch)
        ) {
          setBranch(current)
        }
      } catch (error) {
        if (!active) return
        setBranches([])
      } finally {
        if (active) setIsLoadingBranches(false)
      }
    }, 400)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [path])

  const handlePickFolder = async () => {
    if (!isTauriAvailable()) return
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog")
      const selection = await openDialog({
        directory: true,
        multiple: false,
      })
      if (typeof selection === "string" && selection.trim()) {
        setPath(selection)
      }
    } catch (error) {
      toast.error("Failed to open folder picker", {
        description: String(error),
      })
    }
  }

  const handleRefreshBranches = async () => {
    if (!path.trim() || !isTauriAvailable()) return
    setIsLoadingBranches(true)
    try {
      const result = await invoke<RepoBranches>("makima_repo_branches", {
        path: path.trim(),
      })
      setBranches(result.branches)
      const current = result.current?.trim()
      if (current && (!branch.trim() || branch === defaultBranch)) {
        setBranch(current)
      }
    } catch (error) {
      setBranches([])
      toast.error("Failed to load branches", {
        description: String(error),
      })
    } finally {
      setIsLoadingBranches(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col space-y-1.5 p-6 pb-2 text-center sm:text-left">
        <h2 className="text-lg font-semibold leading-none tracking-tight">Add repository</h2>
        <p className="text-sm text-muted-foreground">
          Register a local repo so Makima can run and track commands.
        </p>
      </div>
      <form className="grid gap-4 p-6 pt-2" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor={nameId} className="flex items-center gap-2">
            <FolderGit2 className="size-4 text-muted-foreground" />
            Repository name
          </Label>
          <Input
            id={nameId}
            placeholder="billing-api"
            className="h-9"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={pathId} className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            Local path
          </Label>
          <div className="flex gap-2">
            <Input
              id={pathId}
              placeholder="~/codes/billing-api"
              className="h-9 flex-1"
              value={path}
              onChange={(event) => setPath(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePickFolder}
              disabled={!canPickFolder}
              aria-label="Pick folder"
            >
              <FolderOpen className="size-4" />
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={branchId} className="flex items-center gap-2">
            <GitBranch className="size-4 text-muted-foreground" />
            Default branch
          </Label>
          <div className="flex gap-2">
            <Select
              value={branch}
              onValueChange={setBranch}
              disabled={isLoadingBranches}
            >
              <SelectTrigger id={branchId} className="h-9 flex-1">
                <SelectValue placeholder={defaultBranch} />
              </SelectTrigger>
              {branches.length > 0 && (
                <SelectContent>
                  {branches.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              )}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRefreshBranches}
              disabled={!path.trim() || isLoadingBranches || !isTauriAvailable()}
              aria-label="Refresh branches"
            >
              <RefreshCw
                className={isLoadingBranches ? "size-4 animate-spin" : "size-4"}
              />
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={techId} className="flex items-center gap-2">
            <Tag className="size-4 text-muted-foreground" />
            Tech stack (comma separated)
          </Label>
          <Input
            id={techId}
            placeholder="tauri, react, vite"
            className="h-9"
            value={tech}
            onChange={(event) => setTech(event.target.value)}
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => collapse()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Connecting..." : "Connect repo"}
          </Button>
        </div>
      </form>
    </div>
  )
}
