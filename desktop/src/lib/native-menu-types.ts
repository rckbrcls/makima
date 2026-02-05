/**
 * Native macOS Menu Type Definitions
 *
 * Shared types for NativeMenu and NativeContextMenu components.
 * Uses Tauri 2's JavaScript Menu API.
 */

/**
 * Base properties shared by all menu items
 */
interface NativeMenuItemBase {
  /** Unique identifier for the item */
  id: string;
  /** Display text for the item */
  label: string;
  /** Whether the item is enabled (default: true) */
  enabled?: boolean;
  /**
   * Keyboard accelerator (e.g., "CmdOrCtrl+N", "CmdOrCtrl+Shift+S")
   * Use "CmdOrCtrl" for cross-platform Cmd/Ctrl handling
   */
  accelerator?: string;
}

/**
 * Regular menu item
 */
export interface NativeMenuItem extends NativeMenuItemBase {
  type: "item";
}

/**
 * Visual separator between menu items
 */
export interface NativeMenuSeparator {
  type: "separator";
}

/**
 * Checkbox menu item with checked state
 */
export interface NativeMenuCheckItem extends NativeMenuItemBase {
  type: "check";
  /** Whether the item is checked */
  checked: boolean;
}

/**
 * Submenu containing nested items
 */
export interface NativeMenuSubmenu {
  type: "submenu";
  /** Unique identifier for the submenu */
  id: string;
  /** Display text for the submenu */
  label: string;
  /** Whether the submenu is enabled (default: true) */
  enabled?: boolean;
  /** Nested menu items */
  items: Array<NativeMenuItemConfig>;
}

/**
 * Union type of all menu item configurations
 */
export type NativeMenuItemConfig =
  | NativeMenuItem
  | NativeMenuSeparator
  | NativeMenuCheckItem
  | NativeMenuSubmenu;

/**
 * Props for NativeMenu component (click-activated dropdown)
 */
export interface NativeMenuProps {
  /** Menu items configuration */
  items: Array<NativeMenuItemConfig>;
  /** Callback when a regular item is selected */
  onSelect?: (id: string) => void;
  /** Callback when a check item's state changes */
  onCheckedChange?: (id: string, checked: boolean) => void;
  /** Trigger element that opens the menu */
  children: React.ReactNode;
  /** Whether the menu is disabled */
  disabled?: boolean;
}

/**
 * Props for NativeContextMenu component (right-click activated)
 */
export interface NativeContextMenuProps {
  /** Menu items configuration */
  items: Array<NativeMenuItemConfig>;
  /** Callback when a regular item is selected */
  onSelect?: (id: string) => void;
  /** Callback when a check item's state changes */
  onCheckedChange?: (id: string, checked: boolean) => void;
  /** Content that triggers the context menu on right-click */
  children: React.ReactNode;
  /** Whether the context menu is disabled */
  disabled?: boolean;
}
