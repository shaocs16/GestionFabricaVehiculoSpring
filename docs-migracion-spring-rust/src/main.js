import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./style.css";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import java from "highlight.js/lib/languages/java";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";

async function initialize() {
  const markdownResponse = await fetch(
    `${import.meta.env.BASE_URL}MIGRACION_SPRING_BOOT.md`,
  );
  if (!markdownResponse.ok) {
    throw new Error(
      `No se pudo cargar la documentación (${markdownResponse.status}).`,
    );
  }
  const markdown = await markdownResponse.text();

  hljs.registerLanguage("java", java);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("yaml", yaml);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("text", () => ({ name: "Plain text", contains: [] }));

  const documentRoot = document.querySelector("#document");
  const toc = document.querySelector("#toc");
  const sidebar = document.querySelector("#sidebar");
  const workspace = document.querySelector(".workspace");
  const searchPanel = document.querySelector("#search-results");
  const searchInput = document.querySelector("#search-input");
  const searchList = document.querySelector("#search-list");
  const searchSummary = document.querySelector("#search-summary");
  let lastSearchFocus = null;

  function slugify(value) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[`'.]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function notify(message) {
    const status = document.querySelector("#status");
    status.textContent = message;
    status.classList.add("is-visible");
    clearTimeout(notify.timeout);
    notify.timeout = setTimeout(() => {
      status.textContent = "";
      status.classList.remove("is-visible");
    }, 2800);
  }

  marked.setOptions({ gfm: true, breaks: false });
  const visibleMarkdown = markdown.replace(/^# .+\r?\n/, "");
  documentRoot.innerHTML = marked.parse(visibleMarkdown);

  const headings = [...documentRoot.querySelectorAll("h2, h3, h4")];
  const usedIds = new Map();
  headings.forEach((heading) => {
    const base = slugify(heading.textContent);
    const count = usedIds.get(base) || 0;
    usedIds.set(base, count + 1);
    heading.id = count ? `${base}-${count + 1}` : base;
  });

  const chapters = headings.filter((heading) => heading.tagName === "H2");
  toc.innerHTML = chapters
    .map(
      (heading) =>
        `<a href="#${heading.id}" data-route="${heading.id}">${escapeHtml(heading.textContent)}</a>`,
    )
    .join("");

  documentRoot
    .querySelectorAll(
      "pre code:not([data-api-contract-request]):not([data-api-contract-response])",
    )
    .forEach((code) => {
      hljs.highlightElement(code);
      const pre = code.parentElement;
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      const header = document.createElement("div");
      header.className = "code-header";
      const language = [...code.classList]
        .find((name) => name.startsWith("language-"))
        ?.replace("language-", "");
      const label = document.createElement("span");
      label.textContent = language || "código";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "Copiar";
      copy.setAttribute(
        "aria-label",
        `Copiar bloque de ${language || "código"}`,
      );
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code.textContent);
          copy.textContent = "Copiado";
          notify("Código copiado al portapapeles.");
          setTimeout(() => (copy.textContent = "Copiar"), 1800);
        } catch {
          notify("No se pudo copiar. Selecciona el código y usa Ctrl+C.");
        }
      });
      header.append(label, copy);
      pre.before(wrapper);
      wrapper.append(header, pre);
    });

  documentRoot.querySelectorAll("table").forEach((table) => {
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Tabla desplazable");
    table.before(wrapper);
    wrapper.append(table);
  });

  const apiGraphRoot = documentRoot.querySelector("[data-api-graph]");
  if (apiGraphRoot) {
    const loadApiGraph = () =>
      import("./api-graph.js")
        .then(({ initApiGraph }) => initApiGraph(apiGraphRoot))
        .catch((error) => {
          console.error(error);
          apiGraphRoot.classList.add("is-fallback");
          apiGraphRoot.querySelector(".api-graph-stage").innerHTML =
            '<p class="api-graph-fallback">No se pudo cargar la gráfica. La tabla posterior conserva la descripción completa de todas las APIs.</p>';
        });
    if ("IntersectionObserver" in window) {
      const graphObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          graphObserver.disconnect();
          loadApiGraph();
        },
        { rootMargin: "600px 0px" },
      );
      graphObserver.observe(apiGraphRoot);
    } else {
      loadApiGraph();
    }
  }

  const sectionIndex = chapters.map((heading, index) => {
    const next = chapters[index + 1];
    const parts = [];
    let node = heading;
    while (node && node !== next) {
      parts.push(node.textContent || "");
      node = node.nextElementSibling;
    }
    return {
      id: heading.id,
      title: heading.textContent,
      text: parts.join(" ").replace(/\s+/g, " ").trim(),
    };
  });

  function setActive(id, title) {
    document.querySelectorAll("[data-route]").forEach((link) => {
      if (link.dataset.route === id)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    document.querySelector("#context").textContent = `Guía técnica / ${title}`;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) setActive(visible.target.id, visible.target.textContent);
    },
    { rootMargin: "-10% 0px -78% 0px", threshold: 0 },
  );
  chapters.forEach((heading) => observer.observe(heading));

  function closeMenu({ restoreFocus = false } = {}) {
    sidebar.classList.remove("is-open");
    document.querySelector("#open-menu").setAttribute("aria-expanded", "false");
    workspace.inert = false;
    if (restoreFocus) document.querySelector("#open-menu").focus();
  }

  function openMenu() {
    workspace.inert = true;
    sidebar.classList.add("is-open");
    document.querySelector("#open-menu").setAttribute("aria-expanded", "true");
    document.querySelector("#close-menu").focus();
  }

  function updateSearchUrl(query) {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  }

  function renderSearch(query) {
    const normalized = query.trim().toLocaleLowerCase("es");
    const results = normalized
      ? sectionIndex.filter((section) =>
          `${section.title} ${section.text}`
            .toLocaleLowerCase("es")
            .includes(normalized),
        )
      : [];
    searchSummary.textContent = normalized
      ? `${results.length} ${results.length === 1 ? "sección encontrada" : "secciones encontradas"} para “${query.trim()}”.`
      : "Escribe para buscar en toda la guía.";
    searchList.innerHTML = results.length
      ? results
          .map((result) => {
            const lowerText = result.text.toLocaleLowerCase("es");
            const position = lowerText.indexOf(normalized);
            const start = Math.max(0, position - 75);
            const excerpt = `${start > 0 ? "…" : ""}${result.text.slice(start, start + 210)}${result.text.length > start + 210 ? "…" : ""}`;
            return `<a href="#${result.id}" data-search-result><strong>${escapeHtml(result.title)}</strong><span>${escapeHtml(excerpt)}</span></a>`;
          })
          .join("")
      : normalized
        ? '<p class="empty-state">No hay coincidencias. Prueba con “simulación”, “Flyway”, “stock” o “trabajadores”.</p>'
        : "";
  }

  function openSearch() {
    if (!searchPanel.hidden) return;
    lastSearchFocus = document.activeElement;
    searchPanel.hidden = false;
    renderSearch(searchInput.value);
  }

  function closeSearch({ restoreFocus = true } = {}) {
    if (searchPanel.hidden) return;
    searchPanel.hidden = true;
    updateSearchUrl("");
    searchInput.value = "";
    if (restoreFocus && lastSearchFocus instanceof HTMLElement)
      lastSearchFocus.focus();
  }

  document.querySelector("#open-menu").addEventListener("click", openMenu);
  document
    .querySelector("#close-menu")
    .addEventListener("click", () => closeMenu({ restoreFocus: true }));
  sidebar.addEventListener("click", (event) => {
    if (event.target.closest("a") && matchMedia("(max-width: 860px)").matches)
      closeMenu();
  });

  document.querySelector("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    openSearch();
    updateSearchUrl(searchInput.value.trim());
    renderSearch(searchInput.value);
  });
  searchInput.addEventListener("input", () => {
    openSearch();
    updateSearchUrl(searchInput.value.trim());
    renderSearch(searchInput.value);
  });
  document
    .querySelector("#close-search")
    .addEventListener("click", () => closeSearch());
  searchList.addEventListener("click", (event) => {
    if (event.target.closest("[data-search-result]"))
      closeSearch({ restoreFocus: false });
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (event.key === "Escape") {
      if (!searchPanel.hidden) closeSearch();
      else if (sidebar.classList.contains("is-open"))
        closeMenu({ restoreFocus: true });
    }
  });

  let codeExpanded = true;
  document.querySelector("#expand-all").textContent = "Contraer código";
  document.querySelector("#expand-all").addEventListener("click", (event) => {
    codeExpanded = !codeExpanded;
    documentRoot.classList.toggle("code-collapsed", !codeExpanded);
    event.currentTarget.textContent = codeExpanded
      ? "Contraer código"
      : "Expandir código";
    notify(
      codeExpanded
        ? "Todos los bloques de código están expandidos."
        : "Los bloques largos están contraídos.",
    );
  });

  window.addEventListener("hashchange", () => closeMenu());

  const initialQuery = new URLSearchParams(location.search).get("q") || "";
  if (initialQuery) {
    searchInput.value = initialQuery;
    openSearch();
    renderSearch(initialQuery);
  }

  if (location.hash) {
    requestAnimationFrame(() =>
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView(),
    );
  }
}

initialize().catch((error) => {
  console.error(error);
  document.querySelector("#document").innerHTML =
    '<p class="empty-state">No se pudo cargar la documentación. Comprueba que el archivo MIGRACION_SPRING_BOOT.md está disponible y recarga la página.</p>';
});
