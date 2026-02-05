import * as React from "react";
import type {
  NativeMenuCheckItem,
  NativeMenuItem,
  NativeMenuItemConfig,
  NativeMenuProps,
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
 * Native macOS dropdown menu component.
 *
 * Opens a native menu when the trigger element is clicked.
 * Uses Tauri's Menu API for true native appearance.
 *
 * @example
 * ```tsx
 * import { NativeMenu, createMenuItem, createSeparator } from "@/components/ui/native-menu"
 *
 * const items = [
 *   createMenuItem("new", "New File", { accelerator: "CmdOrCtrl+N" }),
 *   createMenuItem("open", "Open...", { accelerator: "CmdOrCtrl+O" }),
 *   createSeparator(),
 *   createMenuItem("settings", "Settings"),
 * ]
 *
 * <NativeMenu items={items} onSelect={(id) => handleAction(id)}>
 *   <Button variant="ghost" size="icon">
 *     <MoreHorizontalIcon />
 *   </Button>
 * </NativeMenu>
 * ```
 */
function NativeMenu({
  items,
  onSelect,
  onCheckedChange,
  children,
  disabled = false,
}: NativeMenuProps) {
  const { showMenu } = useNativeMenu({
    items,
    onSelect,
    onCheckedChange,
  });

  const handleClick = React.useCallback(
    async (event: React.MouseEvent) => {
      if (disabled) return;

      event.preventDefault();
      event.stopPropagation();

      // Show menu at cursor position (native macOS behavior)
      await showMenu();
    },
    [disabled, showMenu],
  );

  return (
    <div
      onClick={handleClick}
      style={{ display: "contents" }}
      data-disabled={disabled || undefined}
    >
      {children}
    </div>
  );
}

export { NativeMenu };
export type {
  NativeMenuCheckItem,
  NativeMenuItem,
  NativeMenuItemConfig,
  NativeMenuProps,
  NativeMenuSeparator,
  NativeMenuSubmenu,
};
