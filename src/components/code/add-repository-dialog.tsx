import { useState, useCallback } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { FolderOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddRepositoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string, path: string, branch?: string) => Promise<void>
}

export function AddRepositoryDialog({
  open: isOpen,
  onOpenChange,
  onAdd,
}: AddRepositoryDialogProps) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [branch, setBranch] = useState('main')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Repository Folder',
      })
      if (selected && typeof selected === 'string') {
        setPath(selected)
        // Auto-set name from folder name if empty
        if (!name) {
          const folderName = selected.split('/').pop() ?? ''
          setName(folderName)
        }
      }
    } catch (err) {
      console.error('Failed to open directory picker:', err)
    }
  }, [name])

  const handleSubmit = useCallback(async () => {
    console.log('[AddRepositoryDialog] handleSubmit called:', { name, path, branch })
    if (!name.trim() || !path.trim()) {
      setError('Name and path are required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[AddRepositoryDialog] Calling onAdd...')
      await onAdd(name.trim(), path.trim(), branch.trim() || undefined)
      console.log('[AddRepositoryDialog] onAdd succeeded')
      // Reset form
      setName('')
      setPath('')
      setBranch('main')
      onOpenChange(false)
    } catch (err) {
      console.error('[AddRepositoryDialog] onAdd error:', err)
      setError(err instanceof Error ? err.message : 'Failed to add repository')
    } finally {
      setIsLoading(false)
    }
  }, [name, path, branch, onAdd, onOpenChange])

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setName('')
      setPath('')
      setBranch('main')
      setError(null)
      onOpenChange(false)
    }
  }, [isLoading, onOpenChange])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Add a local repository to work with code agents.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="my-project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="path">Path</Label>
            <div className="flex gap-2">
              <Input
                id="path"
                placeholder="/path/to/repository"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowse}
                disabled={isLoading}
              >
                <FolderOpen className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="branch">Default Branch</Label>
            <Input
              id="branch"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add Repository
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
