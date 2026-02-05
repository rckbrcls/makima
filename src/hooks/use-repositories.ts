import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useState } from 'react'
import type {
  Repository,
  RepositoryDb,
} from '@/lib/code-types'
import { mapRepository } from '@/lib/code-types'

export function useRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRepositories = useCallback(async () => {
    console.log('[useRepositories] loadRepositories called')
    setIsLoading(true)
    setError(null)
    try {
      const result = await invoke<RepositoryDb[]>('db_list_repositories')
      console.log('[useRepositories] loadRepositories result:', result)
      setRepositories(result.map(mapRepository))
    } catch (err) {
      console.error('[useRepositories] loadRepositories error:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRepositories()
  }, [loadRepositories])

  const getRepository = useCallback(async (id: string): Promise<Repository | null> => {
    try {
      const result = await invoke<RepositoryDb | null>('db_get_repository', { id })
      return result ? mapRepository(result) : null
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [])

  const createRepository = useCallback(
    async (
      name: string,
      path: string,
      branch?: string,
      tech?: string[],
    ): Promise<Repository | null> => {
      console.log('[useRepositories] createRepository called:', { name, path, branch, tech })
      try {
        const result = await invoke<RepositoryDb>('db_create_repository', {
          name,
          path,
          branch,
          tech,
        })
        console.log('[useRepositories] createRepository result:', result)
        const repo = mapRepository(result)
        setRepositories((prev) => {
          console.log('[useRepositories] Updating repositories, prev:', prev.length, 'new:', repo.id)
          return [repo, ...prev]
        })
        return repo
      } catch (err) {
        console.error('[useRepositories] createRepository error:', err)
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [],
  )

  const updateRepository = useCallback(
    async (
      id: string,
      updates: {
        name?: string
        branch?: string
        tech?: string[]
        status?: string
      },
    ): Promise<boolean> => {
      try {
        const result = await invoke<boolean>('db_update_repository', {
          id,
          ...updates,
        })
        if (result) {
          setRepositories((prev) =>
            prev.map((repo) =>
              repo.id === id
                ? {
                    ...repo,
                    ...(updates.name && { name: updates.name }),
                    ...(updates.branch && { branch: updates.branch }),
                    ...(updates.tech && { tech: updates.tech }),
                    ...(updates.status && {
                      status: updates.status as Repository['status'],
                    }),
                    updatedAt: Date.now(),
                  }
                : repo,
            ),
          )
        }
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [],
  )

  const deleteRepository = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await invoke<boolean>('db_delete_repository', { id })
      if (result) {
        setRepositories((prev) => prev.filter((repo) => repo.id !== id))
      }
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [])

  return {
    repositories,
    isLoading,
    error,
    loadRepositories,
    getRepository,
    createRepository,
    updateRepository,
    deleteRepository,
    setRepositories,
  }
}
