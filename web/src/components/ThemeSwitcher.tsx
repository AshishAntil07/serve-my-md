import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ThemeSwitch({ className }: { className?: string }) {
  const switchTheme = () => {
    if (document.body.classList.contains("dark")) {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  useEffect(() => {
    const initTheme =
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    if (initTheme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={cn("relative", className)}
        onClick={switchTheme}
      >
        <Sun className="scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 dark:hover:scale-75 dark:hover:rotate-90" />
        <Moon className="absolute scale-100 rotate-0 transition-all hover:scale-100 hover:rotate-0 dark:scale-0 dark:rotate-90" />
      </Button>
    </>
  );
}
