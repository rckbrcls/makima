import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeMenu, createMenuItem } from "@/components/ui/native-menu";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { setTheme } = useTheme();

  const menuItems = [
    createMenuItem("light", "Light"),
    createMenuItem("dark", "Dark"),
    createMenuItem("system", "System"),
  ];

  const handleSelect = (id: string) => {
    setTheme(id as "light" | "dark" | "system");
  };

  return (
    <NativeMenu items={menuItems} onSelect={handleSelect}>
      <Button
        variant="outline"
        size="icon"
        className="border-border bg-card text-foreground h-9 w-9 rounded-full"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </NativeMenu>
  );
}
