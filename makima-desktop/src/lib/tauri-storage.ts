import { Store } from "@tauri-apps/plugin-store"

const isBrowser = typeof window !== "undefined"

export function createTauriStorage(filename: string) {
  const storage = {
    store: null as Store | null,

    getItem: async (name: string): Promise<string | null> => {
      if (!isBrowser) return null
      try {
        if (!storage.store) {
          storage.store = await Store.load(filename, { autoSave: true })
        }
        return (await storage.store.get<string>(name)) ?? null
      } catch (error) {
        console.warn(`[tauri-storage] ${filename} read failed:`, error)
        return localStorage.getItem(name)
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      if (!isBrowser) return
      try {
        if (!storage.store) {
          storage.store = await Store.load(filename, { autoSave: true })
        }
        await storage.store.set(name, value)
        await storage.store.save()
      } catch (error) {
        console.warn(`[tauri-storage] ${filename} write failed:`, error)
        localStorage.setItem(name, value)
      }
    },

    removeItem: async (name: string): Promise<void> => {
      if (!isBrowser) return
      try {
        if (!storage.store) {
          storage.store = await Store.load(filename, { autoSave: true })
        }
        await storage.store.delete(name)
        await storage.store.save()
      } catch (error) {
        console.warn(`[tauri-storage] ${filename} remove failed:`, error)
        localStorage.removeItem(name)
      }
    },
  }
  return storage
}
