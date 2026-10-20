const mac = /Mac|iPhone|iPad/.test(navigator.platform);
export const modLabel = mac ? "⌘" : "Ctrl";
export const shortcutLabel = (keys: string) => keys.replace("Mod", modLabel).replace("Alt", mac ? "⌥" : "Alt");

interface Command {
  label: string;
  keys?: string;
  run: () => void;
  element?: string;
}

export function initShortcuts(actions: { toggleView: () => void; save: () => void; deleteNote: () => void; searchNotes: () => void; beforeOpen: () => void }): void {
  const click = (selector: string) => () => document.querySelector<HTMLElement>(selector)?.click();
  const commands: Command[] = [
    { label: "New note", keys: "Mod+Shift+Enter", run: click("#new-snippet-btn"), element: "#new-snippet-btn" },
    { label: "Toggle note history", keys: "Mod+\\", run: click("#sidebar-toggle") },
    { label: "Toggle Markdown / Rich", keys: "Mod+E", run: actions.toggleView, element: "#view-toggle" },
    { label: "Export current view (Raw / PDF)", keys: "Mod+Shift+E", run: click("#export-btn") },
    { label: "Toggle focus mode", run: click("#focus-mode-btn") },
    { label: "Toggle full width", run: click("#writing-width-btn") },
    { label: "Import Markdown files", run: click("#import-notes-btn") },
    { label: "Download complete backup", run: click("#backup-btn") },
    { label: "Restore backup", run: click("#restore-backup-btn") },
    { label: "Open Trash", run: click("#trash-btn") },
    { label: "Copy Markdown", run: click("#copy-markdown-btn") },
    { label: "Save note", keys: "Mod+S", run: actions.save },
    { label: "System theme", keys: "Alt+Shift+1", run: click('[data-theme-value="system"]'), element: '[data-theme-value="system"]' },
    { label: "Light theme", keys: "Alt+Shift+2", run: click('[data-theme-value="light"]'), element: '[data-theme-value="light"]' },
    { label: "Dark theme", keys: "Alt+Shift+3", run: click('[data-theme-value="dark"]'), element: '[data-theme-value="dark"]' },
    { label: "Delete current note", keys: "Mod+Shift+Backspace", run: actions.deleteNote },
    { label: "Search notes", keys: "Mod+Shift+F", run: actions.searchNotes, element: "#note-search" },
    { label: "Privacy policy", keys: "Alt+Shift+P", run: click("#privacy-fab"), element: "#privacy-fab" },
  ];
  for (const command of commands) {
    if (!command.element || !command.keys) continue;
    const el = document.querySelector<HTMLElement>(command.element)!;
    el.title = `${command.label} (${shortcutLabel(command.keys)})`;
    el.setAttribute("aria-keyshortcuts", command.keys.replace("Mod", mac ? "Meta" : "Control"));
  }

  for (const button of document.querySelectorAll<HTMLElement>(".view-opt")) {
    button.setAttribute("aria-keyshortcuts", mac ? "Meta+E" : "Control+E");
    button.title = `Toggle Markdown / Rich (${shortcutLabel("Mod+E")}${mac ? " or ⌘+Option, then release" : ""})`;
  }

  const dialog = document.createElement("dialog");
  dialog.className = "command-dialog";
  dialog.setAttribute("aria-labelledby", "command-title");
  dialog.innerHTML = '<div class="command-header"><h2 id="command-title">Commands & shortcuts</h2><button type="button" aria-label="Close commands" title="Close (Esc)">×</button></div><input type="search" aria-label="Search commands" placeholder="Search commands…" /><div class="command-list"></div><p class="command-hint">↑ ↓ to navigate · Enter to run · Esc to close</p>';
  document.body.appendChild(dialog);
  const search = dialog.querySelector("input")!;
  const list = dialog.querySelector<HTMLDivElement>(".command-list")!;
  let previousFocus: HTMLElement | null = null;
  let ranCommand = false;
  function render(): void {
    list.replaceChildren();
    for (const command of commands.filter(c => c.label.toLowerCase().includes(search.value.toLowerCase()))) {
      const button = document.createElement("button");
      button.type = "button";
      const label = document.createElement("span");
      label.textContent = command.label;
      const keys = document.createElement("kbd");
      keys.textContent = (command.keys ? shortcutLabel(command.keys) : "") + (mac && command.run === actions.toggleView ? " / ⌘+Option" : "");
      button.append(label, keys);
      button.addEventListener("click", () => { ranCommand = true; dialog.close(); command.run(); });
      list.append(button);
    }
    if (!list.childElementCount) list.textContent = "No matching commands";
  }
  function open(): void {
    if (dialog.open) { dialog.close(); return; }
    actions.beforeOpen();
    ranCommand = false;
    previousFocus = document.activeElement as HTMLElement | null;
    search.value = "";
    render();
    dialog.showModal();
    search.focus();
  }
  dialog.querySelector("button")!.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { if (!ranCommand) previousFocus?.focus(); });
  search.addEventListener("input", render);
  dialog.addEventListener("keydown", event => {
    const buttons = [...list.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : (index <= 0 ? buttons.length - 1 : index - 1);
      buttons[next]?.focus();
    } else if (event.key === "Enter" && document.activeElement === search) {
      event.preventDefault();
      buttons[0]?.click();
    }
  });
  const help = document.getElementById("shortcuts-btn")!;
  help.title = `Commands & shortcuts (${shortcutLabel("Mod+K")} or ${shortcutLabel("Mod+Shift+/")})`;
  help.setAttribute("aria-keyshortcuts", mac ? "Meta+K" : "Control+K");
  help.addEventListener("click", open);

  // A modifier-only chord fires on release, so Cmd+Option+another key
  // can cancel it before changing the view. Never consume those key events.
  if (mac) {
    let armed = false;
    let cancelled = false;
    const held = new Set<string>();
    const reset = () => { armed = false; cancelled = false; held.clear(); };
    window.addEventListener("keydown", event => {
      held.add(event.code);
      if (document.querySelector("dialog[open]") || event.isComposing || event.ctrlKey || event.shiftKey ||
          (event.key !== "Meta" && event.key !== "Alt")) {
        armed = false;
        cancelled = true;
      } else if (event.metaKey && event.altKey && !cancelled &&
          [...held].every(code => code.startsWith("Meta") || code.startsWith("Alt"))) {
        armed = true;
      }
    }, true);
    window.addEventListener("keyup", event => {
      held.delete(event.code);
      if (armed && !event.isComposing && !event.ctrlKey && !event.shiftKey &&
          (event.key === "Meta" || event.key === "Alt") && !(event.metaKey && event.altKey)) {
        armed = false;
        cancelled = true;
        if (!document.querySelector("dialog[open]")) actions.toggleView();
      }
      if (!event.metaKey && !event.altKey) reset();
    }, true);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
  }

  function matches(event: KeyboardEvent, keys: string): boolean {
    const parts = keys.toLowerCase().split("+");
    const key = parts.pop()!;
    return (parts.includes("mod") ? (mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) : !event.metaKey && !event.ctrlKey)
      && event.altKey === parts.includes("alt") && event.shiftKey === parts.includes("shift")
      && (event.key.toLowerCase() === key || (key === "/" && event.code === "Slash") || (key.length === 1 && event.code === (/\d/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}`)));
  }
  window.addEventListener("keydown", event => {
    if (event.isComposing || event.repeat || document.querySelector(".copy-dialog[open], .trash-dialog[open], .ownership-dialog[open], .diagram-dialog[open]")) return;
    if (matches(event, "Mod+K") || matches(event, "Mod+Shift+/")) {
      event.preventDefault(); event.stopImmediatePropagation(); open(); return;
    }
    if (dialog.open || document.querySelector(".mobile-actions-dialog[open]")) return;
    const command = commands.find(c => c.keys && matches(event, c.keys));
    if (!command) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    command.run();
  }, true);
}
