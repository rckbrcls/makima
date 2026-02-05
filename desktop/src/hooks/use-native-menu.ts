import { useCallback, useRef } from "react";
import {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from "@tauri-apps/api/menu";
import type { NativeMenuItemConfig } from "@/lib/native-menu-types";

interface UseNativeMenuOptions {
  items: Array<NativeMenuItemConfig>;
  onSelect?: (id: string) => void;
  onCheckedChange?: (id: string, checked: boolean) => void;
}

/**
 * Hook for creating and showing native macOS menus using Tauri's Menu API.
 *
 * Creates a fresh menu on each show to ensure latest state (checked, enabled).
 * Menu appears at cursor position (native macOS behavior).
 */
export function useNativeMenu({
  items,
  onSelect,
  onCheckedChange,
}: UseNativeMenuOptions) {
  const menuRef = useRef<Menu | null>(null);

  /**
   * Recursively builds menu items from configuration
   */
  const buildMenuItems = useCallback(
    async (
      configs: Array<NativeMenuItemConfig>,
    ): Promise<
      Array<CheckMenuItem | MenuItem | PredefinedMenuItem | Submenu>
    > => {
      const menuItems: Array<
        CheckMenuItem | MenuItem | PredefinedMenuItem | Submenu
      > = [];

      for (const config of configs) {
        switch (config.type) {
          case "item": {
            const item = await MenuItem.new({
              id: config.id,
              text: config.label,
              enabled: config.enabled ?? true,
              accelerator: config.accelerator,
              action: () => {
                onSelect?.(config.id);
              },
            });
            menuItems.push(item);
            break;
          }

          case "separator": {
            const separator = await PredefinedMenuItem.new({
              item: "Separator",
            });
            menuItems.push(separator);
            break;
          }

          case "check": {
            const checkItem = await CheckMenuItem.new({
              id: config.id,
              text: config.label,
              enabled: config.enabled ?? true,
              checked: config.checked,
              accelerator: config.accelerator,
              action: () => {
                onCheckedChange?.(config.id, !config.checked);
              },
            });
            menuItems.push(checkItem);
            break;
          }

          case "submenu": {
            const submenuItems = await buildMenuItems(config.items);
            const submenu = await Submenu.new({
              id: config.id,
              text: config.label,
              enabled: config.enabled ?? true,
              items: submenuItems,
            });
            menuItems.push(submenu);
            break;
          }
        }
      }

      return menuItems;
    },
    [onSelect, onCheckedChange],
  );

  /**
   * Shows the menu at cursor position (native macOS behavior)
   */
  const showMenu = useCallback(async () => {
    // Build fresh menu to ensure latest state
    const menuItems = await buildMenuItems(items);
    const menu = await Menu.new({ items: menuItems });
    menuRef.current = menu;

    // Show at cursor position
    await menu.popup();
  }, [items, buildMenuItems]);

  /**
   * Closes the menu if it's open
   */
  const closeMenu = useCallback(async () => {
    if (menuRef.current) {
      await menuRef.current.close();
      menuRef.current = null;
    }
  }, []);

  return {
    showMenu,
    closeMenu,
  };
}
