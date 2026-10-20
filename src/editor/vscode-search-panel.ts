import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceNext,
  replaceAll,
  selectMatches,
  setSearchQuery,
  SearchQuery,
} from "@codemirror/search";
import type { EditorView, Panel, ViewUpdate } from "@codemirror/view";

const ICONS = {
  chevronRight: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.2 3.3L10.9 8l-4.7 4.7-.7-.7L9.5 8 5.5 4z"/></svg>`,
  chevronDown: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.3 6.2L8 10.9l4.7-4.7.7.7L8 12.3 2.6 6.9z"/></svg>`,
  prevMatch: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 4.2l4.4 4.4-.7.7L8.5 6.1V12h-1V6.1L4.3 9.3l-.7-.7z"/></svg>`,
  nextMatch: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 11.8L3.6 7.4l.7-.7 3.2 3.2V4h1v5.9l3.2-3.2.7.7z"/></svg>`,
  selectAll: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 4h12v1.2H2V4zm0 3.4h12v1.2H2V7.4zm0 3.4h12v1.2H2v-1.2z"/></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M12.7 4L8.7 8l4 4-.7.7-4-4-4 4-.7-.7 4-4-4-4 .7-.7 4 4 4-4z"/></svg>`,
  replace: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 4h6.5c1.4 0 2.5 1.1 2.5 2.5v.5h-1v-.5c0-.8-.7-1.5-1.5-1.5H3V4zm7.5 7H4c-1.4 0-2.5-1.1-2.5-2.5V8h1v.5c0 .8.7 1.5 1.5 1.5h6.5v-1.5l2.5 2-2.5 2V11z"/></svg>`,
  replaceAll: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 3.5h7v1H2zm0 4h5v1H2zm0 4h7v1H2zm10.7-3.8L15 6l-2.3-2.3-.7.7 1.1 1.1H9.5v1h3.6l-1.1 1.1zM9.5 12h5.5v1H9.5z"/></svg>`,
};

export class VSCodeSearchPanel implements Panel {
  readonly dom: HTMLElement;
  readonly top = true;
  private readonly searchInput: HTMLInputElement;
  private readonly replaceInput: HTMLInputElement;
  private readonly searchWrapper: HTMLElement;
  private readonly replaceRow: HTMLElement;
  private readonly toggleReplaceBtn: HTMLButtonElement;
  private readonly matchCountEl: HTMLElement;
  private readonly caseBtn: HTMLButtonElement;
  private readonly wordBtn: HTMLButtonElement;
  private readonly regexBtn: HTMLButtonElement;
  private readonly preserveCaseBtn: HTMLButtonElement;
  private query: SearchQuery;
  private isReplaceOpen = false;

  constructor(private readonly view: EditorView) {
    let initialQuery: SearchQuery;
    try {
      initialQuery = getSearchQuery(view.state) ?? new SearchQuery({ search: "" });
    } catch {
      initialQuery = new SearchQuery({ search: "" });
    }
    this.query = initialQuery;

    const dom = document.createElement("div");
    dom.className = "cm-search cm-vscode-search";
    dom.setAttribute("role", "search");
    dom.setAttribute("aria-label", "Find and Replace");

    dom.innerHTML = `
      <div class="cm-search-inner">
        <!-- Row 1: Find -->
        <div class="cm-search-row cm-find-row">
          <button type="button" class="cm-icon-btn cm-search-toggle-replace" aria-label="Toggle Replace" aria-expanded="false" title="Toggle Replace">
            ${ICONS.chevronRight}
          </button>

          <div class="cm-search-input-box cm-find-input-box">
            <input
              type="text"
              name="search"
              class="cm-textfield cm-find-input"
              placeholder="Find"
              aria-label="Find"
              main-field="true"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            />
            <div class="cm-search-input-actions">
              <button type="button" class="cm-search-toggle-opt cm-opt-case" aria-label="Match Case (Alt+C)" title="Match Case (Alt+C)" aria-pressed="false">
                <span class="cm-opt-text">Aa</span>
              </button>
              <button type="button" class="cm-search-toggle-opt cm-opt-word" aria-label="Match Whole Word (Alt+W)" title="Match Whole Word (Alt+W)" aria-pressed="false">
                <span class="cm-opt-text cm-opt-word-text">ab</span>
              </button>
              <button type="button" class="cm-search-toggle-opt cm-opt-regex" aria-label="Use Regular Expression (Alt+R)" title="Use Regular Expression (Alt+R)" aria-pressed="false">
                <span class="cm-opt-text cm-opt-regex-text">.*</span>
              </button>
            </div>
          </div>

          <span class="cm-search-count" aria-live="polite"></span>

          <div class="cm-search-actions">
            <button type="button" class="cm-icon-btn cm-btn-prev" aria-label="Previous Match (Shift+Enter)" title="Previous Match (Shift+Enter)">
              ${ICONS.prevMatch}
            </button>
            <button type="button" class="cm-icon-btn cm-btn-next" aria-label="Next Match (Enter)" title="Next Match (Enter)">
              ${ICONS.nextMatch}
            </button>
            <button type="button" class="cm-icon-btn cm-btn-select-all" aria-label="Select All Matches (Alt+Enter)" title="Select All Matches (Alt+Enter)">
              ${ICONS.selectAll}
            </button>
            <button type="button" class="cm-icon-btn cm-btn-close" aria-label="Close (Escape)" title="Close (Escape)">
              ${ICONS.close}
            </button>
          </div>
        </div>

        <!-- Row 2: Replace -->
        <div class="cm-search-row cm-replace-row" hidden>
          <div class="cm-search-spacer"></div>

          <div class="cm-search-input-box cm-replace-input-box">
            <input
              type="text"
              name="replace"
              class="cm-textfield cm-replace-input"
              placeholder="Replace"
              aria-label="Replace"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            />
            <div class="cm-search-input-actions">
              <button type="button" class="cm-search-toggle-opt cm-opt-preserve-case" aria-label="Preserve Case (AB)" title="Preserve Case" aria-pressed="false">
                <span class="cm-opt-text">AB</span>
              </button>
            </div>
          </div>

          <div class="cm-search-actions cm-replace-actions">
            <button type="button" class="cm-icon-btn cm-btn-replace" aria-label="Replace (Enter)" title="Replace (Enter)">
              ${ICONS.replace}
            </button>
            <button type="button" class="cm-icon-btn cm-btn-replace-all" aria-label="Replace All (Ctrl+Alt+Enter)" title="Replace All (Cmd+Alt+Enter)">
              ${ICONS.replaceAll}
            </button>
          </div>
        </div>
      </div>
    `;

    this.dom = dom;
    this.searchInput = dom.querySelector<HTMLInputElement>('input[name="search"]')!;
    this.replaceInput = dom.querySelector<HTMLInputElement>('input[name="replace"]')!;
    this.searchWrapper = dom.querySelector<HTMLElement>(".cm-find-input-box")!;
    this.replaceRow = dom.querySelector<HTMLElement>(".cm-replace-row")!;
    this.toggleReplaceBtn = dom.querySelector<HTMLButtonElement>(".cm-search-toggle-replace")!;
    this.matchCountEl = dom.querySelector<HTMLElement>(".cm-search-count")!;
    this.caseBtn = dom.querySelector<HTMLButtonElement>(".cm-opt-case")!;
    this.wordBtn = dom.querySelector<HTMLButtonElement>(".cm-opt-word")!;
    this.regexBtn = dom.querySelector<HTMLButtonElement>(".cm-opt-regex")!;
    this.preserveCaseBtn = dom.querySelector<HTMLButtonElement>(".cm-opt-preserve-case")!;

    this.initEvents();
    this.updateMatchCount();
  }

  private initEvents(): void {
    // Chevron toggle
    this.toggleReplaceBtn.addEventListener("click", () => this.toggleReplace());

    // Input listeners
    this.searchInput.addEventListener("input", () => this.commit());
    this.replaceInput.addEventListener("input", () => this.commit());

    // Option toggles
    this.caseBtn.addEventListener("click", () => {
      this.toggleOption(this.caseBtn);
      this.commit();
    });
    this.wordBtn.addEventListener("click", () => {
      this.toggleOption(this.wordBtn);
      this.commit();
    });
    this.regexBtn.addEventListener("click", () => {
      this.toggleOption(this.regexBtn);
      this.commit();
    });
    this.preserveCaseBtn.addEventListener("click", () => {
      this.toggleOption(this.preserveCaseBtn);
    });

    // Action buttons
    this.dom.querySelector(".cm-btn-prev")?.addEventListener("click", () => {
      findPrevious(this.view);
      this.searchInput.focus();
    });
    this.dom.querySelector(".cm-btn-next")?.addEventListener("click", () => {
      findNext(this.view);
      this.searchInput.focus();
    });
    this.dom.querySelector(".cm-btn-select-all")?.addEventListener("click", () => {
      selectMatches(this.view);
      this.view.focus();
    });
    this.dom.querySelector(".cm-btn-close")?.addEventListener("click", () => {
      closeSearchPanel(this.view);
    });
    this.dom.querySelector(".cm-btn-replace")?.addEventListener("click", () => {
      replaceNext(this.view);
      this.replaceInput.focus();
    });
    this.dom.querySelector(".cm-btn-replace-all")?.addEventListener("click", () => {
      replaceAll(this.view);
      this.replaceInput.focus();
    });

    // Keydown handlers
    this.searchInput.addEventListener("keydown", (e) => this.handleFindKeydown(e));
    this.replaceInput.addEventListener("keydown", (e) => this.handleReplaceKeydown(e));
    this.dom.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeSearchPanel(this.view);
      }
    });
  }

  private toggleOption(btn: HTMLButtonElement): void {
    const isPressed = btn.getAttribute("aria-pressed") === "true";
    btn.setAttribute("aria-pressed", String(!isPressed));
    btn.classList.toggle("cm-active", !isPressed);
  }

  public setReplaceOpen(open: boolean): void {
    this.isReplaceOpen = open;
    this.replaceRow.hidden = !open;
    this.toggleReplaceBtn.setAttribute("aria-expanded", String(open));
    this.toggleReplaceBtn.innerHTML = open ? ICONS.chevronDown : ICONS.chevronRight;
  }

  public toggleReplace(): void {
    this.setReplaceOpen(!this.isReplaceOpen);
    if (this.isReplaceOpen) {
      this.replaceInput.focus();
      this.replaceInput.select();
    } else {
      this.searchInput.focus();
    }
  }

  private handleFindKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        findPrevious(this.view);
      } else if (e.altKey) {
        selectMatches(this.view);
      } else {
        findNext(this.view);
      }
      return;
    }

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.code === "KeyC") {
        e.preventDefault();
        this.toggleOption(this.caseBtn);
        this.commit();
      } else if (e.code === "KeyW") {
        e.preventDefault();
        this.toggleOption(this.wordBtn);
        this.commit();
      } else if (e.code === "KeyR") {
        e.preventDefault();
        this.toggleOption(this.regexBtn);
        this.commit();
      }
      return;
    }

    if (e.key === "ArrowDown" && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      if (this.isReplaceOpen) {
        e.preventDefault();
        this.replaceInput.focus();
        this.replaceInput.select();
      }
    }
  }

  private handleReplaceKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      if ((e.metaKey || e.ctrlKey || e.altKey) && !e.shiftKey) {
        replaceAll(this.view);
      } else {
        replaceNext(this.view);
      }
      return;
    }

    if (e.key === "ArrowUp" && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      this.searchInput.focus();
      this.searchInput.select();
    }
  }

  private commit(): void {
    const query = new SearchQuery({
      search: this.searchInput.value,
      caseSensitive: this.caseBtn.getAttribute("aria-pressed") === "true",
      regexp: this.regexBtn.getAttribute("aria-pressed") === "true",
      wholeWord: this.wordBtn.getAttribute("aria-pressed") === "true",
      replace: this.replaceInput.value,
    });

    if (!query.eq(this.query)) {
      this.query = query;
      this.view.dispatch({ effects: setSearchQuery.of(query) });
      this.updateMatchCount();
    }
  }

  private updateMatchCount(): void {
    const searchVal = this.searchInput.value;
    if (!searchVal) {
      this.matchCountEl.textContent = "No results";
      this.matchCountEl.title = "";
      this.searchWrapper.classList.remove("has-error");
      return;
    }

    if (this.query.regexp && !this.query.valid) {
      this.matchCountEl.textContent = "Invalid regex";
      this.matchCountEl.title = "Invalid regular expression";
      this.searchWrapper.classList.add("has-error");
      return;
    }

    this.searchWrapper.classList.remove("has-error");

    try {
      const cursor = this.query.getCursor(this.view.state);
      let total = 0;
      let currentIndex = 0;
      const { from, to } = this.view.state.selection.main;
      const limit = 1000;
      let isCapped = false;

      for (let cur = cursor.next(); !cur.done; cur = cursor.next()) {
        total++;
        if (cur.value.from === from && cur.value.to === to) {
          currentIndex = total;
        }
        if (total >= limit) {
          isCapped = true;
          break;
        }
      }

      if (total === 0) {
        this.matchCountEl.textContent = "No results";
        this.matchCountEl.title = "No results found";
      } else {
        const totalDisplay = isCapped ? `${limit}+` : `${total}`;
        if (currentIndex > 0) {
          this.matchCountEl.textContent = `${currentIndex} of ${totalDisplay}`;
        } else {
          this.matchCountEl.textContent = `${totalDisplay} ${total === 1 ? "match" : "matches"}`;
        }
        this.matchCountEl.title = this.matchCountEl.textContent;
      }
    } catch {
      this.matchCountEl.textContent = "Error";
      this.matchCountEl.title = "Search error";
    }
  }

  update(update: ViewUpdate): void {
    let queryChanged = false;
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery)) {
          const next = effect.value;
          if (!next.eq(this.query)) {
            this.query = next;
            this.syncQueryToInputs(next);
            queryChanged = true;
          }
        }
      }
    }

    if (queryChanged || update.docChanged || update.selectionSet) {
      this.updateMatchCount();
    }
  }

  private syncQueryToInputs(query: SearchQuery): void {
    if (this.searchInput.value !== query.search) {
      this.searchInput.value = query.search;
    }
    if (this.replaceInput.value !== query.replace) {
      this.replaceInput.value = query.replace;
    }
    this.caseBtn.setAttribute("aria-pressed", String(query.caseSensitive));
    this.caseBtn.classList.toggle("cm-active", query.caseSensitive);
    this.wordBtn.setAttribute("aria-pressed", String(query.wholeWord));
    this.wordBtn.classList.toggle("cm-active", query.wholeWord);
    this.regexBtn.setAttribute("aria-pressed", String(query.regexp));
    this.regexBtn.classList.toggle("cm-active", query.regexp);
  }
}
