export function PageHeader() {
  return (
    <header
      className="border-border bg-card fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between gap-4 border-b px-4"
      data-tauri-drag-region
    >
      <div className="ml-22 flex items-center">
        {/* <div className="flex size-6 items-center justify-center shrink-0 overflow-hidden">
          <img
            src="/white-logo.png"
            alt="Logo"
            className="hidden h-full w-auto object-contain dark:block"
          />
          <img
            src="/black-logo.png"
            alt="Logo"
            className="block h-full w-auto object-contain dark:hidden"
          />
        </div> */}
        <span className="tracking-0 text-primary font-serif text-xl font-bold whitespace-nowrap">
          MAKIMA
        </span>
      </div>
    </header>
  );
}
