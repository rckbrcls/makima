import * as React from "react";
import type {
  NativeContextMenuProps,
  NativeMenuCheckItem,
  NativeMenuItem,
  NativeMenuItemConfig,
  NativeMenuSeparator,
  NativeMenuSubmenu,
} from "@/lib/native-menu-types";
import { useNativeMenu } from "@/hooks/use-native-menu";

/**
 * Helper to create a regular menu item
 */
export function createMenuItem(
  id: string,
  label: string,
  options?: { accelerator?: string; enabled?: boolean },
): NativeMenuItem {
  return {
    type: "item",
    id,
    label,
    ...options,
  };
}

/**
 * Helper to create a menu separator
 */
export function createSeparator(): NativeMenuSeparator {
  return { type: "separator" };
}

/**
 * Helper to create a check menu item
 */
export function createCheckItem(
  id: string,
  label: string,
  checked: boolean,
  options?: { accelerator?: string; enabled?: boolean },
): NativeMenuCheckItem {
  return {
    type: "check",
    id,
    label,
    checked,
    ...options,
  };
}

/**
 * Helper to create a submenu
 */
export function createSubmenu(
  id: string,
  label: string,
  items: Array<NativeMenuItemConfig>,
  options?: { enabled?: boolean },
): NativeMenuSubmenu {
  return {
    type: "submenu",
    id,
    label,
    items,
    ...options,
  };
}

/**
 * Native macOS context menu component.
 *
 * Opens a native menu when the wrapped content is right-clicked.
 * Uses Tauri's Menu API for true native appearance.
 *
 * @example
 * ```tsx
 * import { NativeContextMenu, createMenuItem, createSeparator } from "@/components/ui/native-context-menu"
 *
 * const items = [
 *   createMenuItem("cut", "Cut", { accelerator: "CmdOrCtrl+X" }),
 *   createMenuItem("copy", "Copy", { accelerator: "CmdOrCtrl+C" }),
 *   createSeparator(),
 *   createMenuItem("delete", "Delete"),
 * ]
 *
 * <NativeContextMenu items={items} onSelect={(id) => handleAction(id)}>
 *   <div>Right-click me</div>
 * </NativeContextMenu>
 * ```
 */
function NativeContextMenu({
  items,
  onSelect,
  onCheckedChange,
  children,
  disabled = false,
}: NativeContextMenuProps) {
  const { showMenu } = useNativeMenu({
    items,
    onSelect,
    onCheckedChange,
  });

  const handleContextMenu = React.useCallback(
    async (event: React.MouseEvent) => {
      if (disabled) return;

      event.preventDefault();
      event.stopPropagation();

      // Show menu at cursor position (native behavior)
      await showMenu();
    },
    [disabled, showMenu],
  );

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ display: "contents" }}
      data-disabled={disabled || undefined}
    >
      {children}
    </div>
  );
}

export { NativeContextMenu };
export type {
  NativeContextMenuProps,
  NativeMenuCheckItem,
  NativeMenuItem,
  NativeMenuItemConfig,
  NativeMenuSeparator,
  NativeMenuSubmenu,
};
