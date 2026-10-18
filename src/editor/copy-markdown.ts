/** Copy the live source, including pending edits, without touching the editor model. */
export function initCopyMarkdown(getSource: () => string, beforeFallback: () => void = () => {}): () => Promise<void> {
  const button = document.getElementById("copy-markdown-btn") as HTMLButtonElement;
  const status = document.getElementById("copy-status")!;
  const dialog = document.createElement("dialog");
  dialog.className = "command-dialog copy-dialog";
  dialog.setAttribute("aria-labelledby", "copy-title");
  dialog.innerHTML = '<div class="command-header"><h2 id="copy-title">Copy Markdown</h2><button type="button" aria-label="Close manual copy">×</button></div><p>Clipboard access is unavailable. Copy the selected text using your usual copy shortcut.</p><label for="copy-source" class="visually-hidden">Markdown to copy</label><textarea id="copy-source" readonly spellcheck="false"></textarea>';
  document.body.append(dialog);
  const field = dialog.querySelector("textarea")!;
  let previousFocus: HTMLElement | null = null;
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  dialog.querySelector("button")!.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    field.value = "";
    status.textContent = "";
    (previousFocus?.isConnected ? previousFocus : button).focus();
  });
  async function copy(): Promise<void> {
    if (button.disabled || dialog.open) return;
    const source = getSource();
    previousFocus = document.activeElement as HTMLElement | null;
    button.disabled = true;
    clearTimeout(feedbackTimer);
    status.textContent = "Copying Markdown…";
    button.dataset.copied = "false";
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(source);
      status.textContent = "Markdown copied.";
      button.dataset.copied = "true";
      button.title = "Markdown copied";
      feedbackTimer = setTimeout(() => {
        button.dataset.copied = "false";
        button.title = "Copy Markdown";
        status.textContent = "";
      }, 2000);
    } catch {
      status.textContent = "Clipboard unavailable. Manual copy opened.";
      button.title = "Copy Markdown";
      beforeFallback();
      field.value = source;
      // The native modal keeps the fallback accessible and its source inert.
      dialog.showModal();
      field.focus();
      field.select();
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener("click", () => { void copy(); });
  return copy;
}
