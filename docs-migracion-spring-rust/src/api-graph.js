import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { API_LEVELS, API_MODULES } from "./api-contracts.js";

const COLORS = {
  background: 0x111714,
  surface: 0x34413c,
  text: 0xf3f7f5,
  accent: 0x3c9b8e,
  line: 0x60706a,
  GET: 0x4d91aa,
  POST: 0x438e64,
  PATCH: 0xa97724,
  DELETE: 0xa8444d,
};
const POSITIONS = {
  components: [-6, 2.8, 0],
  workers: [-6, -1.6, -0.5],
  stock: [-2.4, 3, -0.4],
  vehicles: [-2.4, 0, 0.4],
  history: [-2.4, -3, -0.3],
  orders: [1.4, 3, 0.4],
  assembly: [1.4, 1, -0.3],
  dashboard: [1.4, -1.1, 0.35],
  reports: [1.4, -3.1, -0.2],
  admin: [5.2, 1.8, 0.3],
  simulation: [5.2, -1.6, -0.2],
};
const CONNECTIONS = [
  ["components", "stock"],
  ["stock", "orders"],
  ["orders", "vehicles"],
  ["orders", "assembly"],
  ["vehicles", "assembly"],
  ["assembly", "history"],
  ["assembly", "dashboard"],
  ["history", "reports"],
  ["dashboard", "reports"],
  ["orders", "simulation"],
  ["simulation", "dashboard"],
  ["admin", "simulation"],
];
const STATUS_TEXT = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
};
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pretty = (value, empty) =>
  value == null ? empty : JSON.stringify(value, null, 2);
const endpointLabel = (summary) => {
  const concise = summary
    .replace(" en borrador", "")
    .replace(" y reservar stock", " stock")
    .replace(" y liberar reservas", " orden")
    .replace("Consultar orden y progreso", "Consultar progreso")
    .replace("Consultar trazabilidad del vehículo", "Ver trazabilidad")
    .replace("Completar estación actual", "Completar estación");
  return concise.length > 21 ? `${concise.slice(0, 20).trim()}…` : concise;
};
const listText = (value, empty = "No aplica") =>
  Array.isArray(value) && value.length
    ? value
        .map((item) =>
          typeof item === "string"
            ? item
            : `${item.name} (${item.type}${item.required ? ", obligatorio" : ""})`,
        )
        .join(" · ")
    : empty;

function explorerMarkup() {
  return `
    <header class="api-graph-heading"><div><p class="api-eyebrow">DIGITAL TWIN · API ARCHITECTURE</p><p class="api-graph-title">Explorador de arquitectura</p><p>Dependencias, contratos y flujo operativo del backend de fábrica.</p></div><div class="api-selection" data-api-selection>Arquitectura completa</div></header>
    <div class="api-graph-toolbar">
      <label class="api-search"><span>Buscar endpoint</span><input type="search" data-api-search placeholder="Ruta o descripción…" autocomplete="off"></label>
      <label><span>Método</span><select data-api-method>${["ALL", "GET", "POST", "PATCH", "DELETE"].map((v) => `<option value="${v}">${v === "ALL" ? "Todos" : v}</option>`).join("")}</select></label>
      <label><span>Nivel</span><select data-api-level-filter>${API_LEVELS.map((v) => `<option value="${v}">${v === "ALL" ? "Todos" : v}</option>`).join("")}</select></label>
      <button type="button" class="api-button" data-api-clear>Limpiar filtros</button>
      <button type="button" class="api-button" data-api-fit>Ajustar vista</button>
      <button type="button" class="api-button api-button-primary" data-api-reset>Arquitectura completa</button>
    </div>
    <div class="api-mobile-modules" data-api-controls role="group" aria-label="Seleccionar módulo API"></div>
    <div class="api-graph-layout">
      <section class="api-graph-stage" aria-label="Mapa de arquitectura">
        <canvas data-api-canvas role="img" tabindex="0" aria-label="Mapa tridimensional navegable de módulos y endpoints"></canvas>
        <p class="api-graph-tooltip" data-api-tooltip hidden></p>
        <div class="api-stage-top"><span data-api-mode>VISTA ARQUITECTURA</span><span data-api-count>0 resultados</span></div>
        <div class="api-camera-controls" aria-label="Controles de cámara"><button type="button" data-camera="left" aria-label="Girar a la izquierda">←</button><button type="button" data-camera="up" aria-label="Girar hacia arriba">↑</button><button type="button" data-camera="down" aria-label="Girar hacia abajo">↓</button><button type="button" data-camera="right" aria-label="Girar a la derecha">→</button><button type="button" data-camera="in" aria-label="Acercar">+</button><button type="button" data-camera="out" aria-label="Alejar">−</button></div>
        <div class="api-graph-legend" aria-label="Leyenda HTTP">${["GET", "POST", "PATCH", "DELETE"].map((v) => `<span data-method="${v}">${v}</span>`).join("")}</div>
      </section>
      <aside class="api-inspector" aria-label="Inspector de API">
        <header class="api-module-summary"><p class="api-detail-level" data-api-level>Arquitectura completa</p><h3 data-api-title>Mapa de dependencias</h3><p data-api-purpose>Selecciona un módulo para consultar su responsabilidad y contratos.</p><div class="api-detail-flow"><span>FLUJO FUNCIONAL</span><strong data-api-flow>Componentes → stock → órdenes → montaje → informes</strong></div></header>
        <section class="api-endpoints-section"><div class="api-section-heading"><h4>Endpoints</h4><span data-api-list-count>Selecciona un módulo</span></div><div class="api-endpoint-list" data-api-endpoints aria-label="Endpoints del módulo"></div></section>
        <section class="api-contract" data-api-contract hidden aria-labelledby="api-contract-title" aria-live="polite">
          <div class="api-contract-route"><span data-api-contract-method></span><code data-api-contract-path></code><button type="button" data-api-copy="path">Copiar ruta</button></div>
          <h4 id="api-contract-title" data-api-contract-title></h4><p data-api-contract-description></p>
          <dl class="api-contract-facts">
            <div><dt>Rol necesario</dt><dd data-api-role></dd></div><div><dt>Transacción</dt><dd data-api-transaction></dd></div>
            <div><dt>Entidades / tablas</dt><dd data-api-entities></dd></div><div><dt>Respuesta correcta</dt><dd data-api-contract-status></dd></div>
            <div><dt>Parámetros de ruta</dt><dd data-api-path-params></dd></div><div><dt>Query parameters</dt><dd data-api-query-params></dd></div>
            <div><dt>Efectos secundarios</dt><dd data-api-side-effects></dd></div><div><dt>Siguiente estado</dt><dd data-api-result-state></dd></div>
          </dl>
          <div class="api-errors"><h5>Errores previstos</h5><ul data-api-contract-errors></ul></div>
          <div class="api-contract-code"><p><span>Petición JSON</span><button type="button" data-api-copy="request">Copiar</button></p><pre><code data-api-contract-request></code></pre></div>
          <div class="api-contract-code"><p><span>Respuesta JSON</span><button type="button" data-api-copy="response">Copiar</button></p><pre><code data-api-contract-response></code></pre></div>
        </section>
      </aside>
    </div>`;
}

function makeLabel(text, subtitle = "", width = 430) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = subtitle ? 120 : 70;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f3f7f5";
  ctx.font = "600 27px IBM Plex Sans, Arial";
  ctx.fillText(text, width / 2, subtitle ? 43 : 35);
  if (subtitle) {
    ctx.fillStyle = "#b8c5c0";
    ctx.font = "500 18px IBM Plex Sans, Arial";
    ctx.fillText(subtitle, width / 2, 82);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width / 120, canvas.height / 120, 1);
  sprite.userData.dispose = () => {
    texture.dispose();
    material.dispose();
  };
  return sprite;
}

export function initApiGraph(root) {
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = "true";
  root.innerHTML = explorerMarkup();
  const $ = (selector) => root.querySelector(selector);
  const $$ = (selector) => [...root.querySelectorAll(selector)];
  const canvas = $("[data-api-canvas]"),
    stage = $(".api-graph-stage"),
    search = $("[data-api-search]"),
    methodFilter = $("[data-api-method]"),
    levelFilter = $("[data-api-level-filter]"),
    controls = $("[data-api-controls]"),
    endpointList = $("[data-api-endpoints]"),
    contract = $("[data-api-contract]"),
    tooltip = $("[data-api-tooltip]");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    stage.innerHTML =
      '<p class="api-graph-fallback">WebGL no está disponible. Utiliza la lista de módulos y contratos accesibles.</p>';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(COLORS.background);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.3, 19);
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = false;
  orbit.minDistance = 10;
  orbit.maxDistance = 28;
  orbit.minPolarAngle = Math.PI * 0.32;
  orbit.maxPolarAngle = Math.PI * 0.68;
  orbit.minAzimuthAngle = -0.2;
  orbit.maxAzimuthAngle = 0.2;
  orbit.rotateSpeed = 0.45;
  orbit.target.set(0, 0, 0);
  orbit.addEventListener("change", render);
  scene.add(new THREE.HemisphereLight(0xe8f1ed, 0x26312d, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 8, 10);
  scene.add(key);
  const moduleGroup = new THREE.Group(),
    connectionGroup = new THREE.Group(),
    endpointGroup = new THREE.Group();
  scene.add(connectionGroup, moduleGroup, endpointGroup);
  const moduleMeshes = new Map(),
    endpointMeshes = new Map(),
    interactives = [];
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let selectedModule = null,
    selectedEndpoint = 0,
    architecture = true,
    animation = null,
    visible = true;

  const moduleGeometry = new RoundedBoxGeometry(2.7, 1.1, 0.62, 5, 0.12);
  API_MODULES.forEach((module) => {
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.surface,
      roughness: 0.72,
      metalness: 0.08,
    });
    const mesh = new THREE.Mesh(moduleGeometry, material);
    mesh.position.fromArray(POSITIONS[module.id]);
    mesh.userData = {
      kind: "module",
      module,
      id: module.id,
      home: mesh.position.clone(),
    };
    moduleGroup.add(mesh);
    interactives.push(mesh);
    const label = makeLabel(
      module.name,
      `${module.level} · ${module.endpoints.length} endpoints`,
    );
    label.position.copy(mesh.position).add(new THREE.Vector3(0, 0, 0.42));
    label.userData.home = label.position.clone();
    moduleGroup.add(label);
    moduleMeshes.set(module.id, { mesh, label });
  });
  CONNECTIONS.forEach(([fromId, toId]) => {
    const points = [
      moduleMeshes.get(fromId).mesh.position,
      moduleMeshes.get(toId).mesh.position,
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: COLORS.line,
      transparent: true,
      opacity: 0.7,
    });
    const line = new THREE.Line(geometry, material);
    connectionGroup.add(line);
  });

  controls.innerHTML = API_MODULES.map(
    (module) =>
      `<button type="button" data-api-id="${module.id}" aria-pressed="false"><span>${escapeHtml(module.name)}</span><small>${module.endpoints.length}</small></button>`,
  ).join("");
  const filteredModules = () =>
    API_MODULES.filter(
      (module) =>
        levelFilter.value === "ALL" || module.level === levelFilter.value,
    );
  const filteredEndpoints = (module) =>
    module.endpoints
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          (methodFilter.value === "ALL" ||
            item.method === methodFilter.value) &&
          (!search.value.trim() ||
            `${item.path} ${item.summary} ${item.description}`
              .toLocaleLowerCase("es")
              .includes(search.value.trim().toLocaleLowerCase("es"))),
      );
  function render() {
    if (visible) renderer.render(scene, camera);
  }
  function disposeEndpoints() {
    endpointMeshes.clear();
    while (endpointGroup.children.length) {
      const child = endpointGroup.children.pop();
      child.geometry?.dispose();
      child.material?.dispose();
      child.userData.dispose?.();
      const i = interactives.indexOf(child);
      if (i >= 0) interactives.splice(i, 1);
    }
  }
  function updateUrl() {
    const url = new URL(location.href);
    if (selectedModule) {
      url.searchParams.set("api", selectedModule.id);
      const endpoint = selectedModule.endpoints[selectedEndpoint];
      url.searchParams.set(
        "endpoint",
        endpoint.path.split("/").filter(Boolean).at(-1)?.replace(/[{}]/g, "") ||
          String(selectedEndpoint),
      );
    } else {
      url.searchParams.delete("api");
      url.searchParams.delete("endpoint");
    }
    history.replaceState(null, "", url);
  }
  function renderList() {
    if (!selectedModule) {
      endpointList.innerHTML =
        '<p class="api-empty">Selecciona un módulo en el mapa o en la fila superior.</p>';
      $("[data-api-list-count]").textContent = "Selecciona un módulo";
      return;
    }
    const items = filteredEndpoints(selectedModule);
    $("[data-api-list-count]").textContent =
      `${items.length} de ${selectedModule.endpoints.length}`;
    endpointList.innerHTML = items.length
      ? items
          .map(
            ({ item, index }) =>
              `<button type="button" data-endpoint-index="${index}" aria-pressed="${index === selectedEndpoint}"><span data-method="${item.method}">${item.method}</span><span><code>${escapeHtml(item.path)}</code><small>${escapeHtml(item.summary)}</small></span></button>`,
          )
          .join("")
      : '<p class="api-empty">No hay endpoints que coincidan con los filtros.</p>';
  }
  function updateContract() {
    const item = selectedModule?.endpoints[selectedEndpoint];
    contract.hidden = !item;
    if (!item) return;
    $("[data-api-contract-method]").textContent = item.method;
    $("[data-api-contract-method]").dataset.method = item.method;
    $("[data-api-contract-path]").textContent = item.path;
    $("[data-api-contract-title]").textContent = item.summary;
    $("[data-api-contract-description]").textContent =
      item.description || "Sin descripción adicional.";
    $("[data-api-role]").textContent = item.requiredRole || "No aplica";
    $("[data-api-transaction]").textContent = item.transactional || "No aplica";
    $("[data-api-entities]").textContent = listText(item.entities, "No aplica");
    $("[data-api-path-params]").textContent = listText(
      item.pathParameters,
      "Sin parámetros",
    );
    $("[data-api-query-params]").textContent = listText(
      item.queryParameters,
      "Sin parámetros",
    );
    $("[data-api-side-effects]").textContent = listText(
      item.sideEffects,
      "Sin efectos secundarios",
    );
    $("[data-api-result-state]").textContent = String(
      item.resultingState || "No aplica",
    );
    $("[data-api-contract-status]").textContent =
      `${item.status} ${STATUS_TEXT[item.status] || ""}`.trim();
    $("[data-api-contract-errors]").innerHTML = item.errors?.length
      ? item.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")
      : "<li>Sin errores de negocio específicos</li>";
    $("[data-api-contract-request]").textContent = pretty(
      item.request,
      "No requiere cuerpo",
    );
    $("[data-api-contract-response]").textContent = pretty(
      item.response,
      item.status === 204 ? "Sin cuerpo de respuesta" : "No aplica",
    );
  }
  function rebuildEndpoints() {
    disposeEndpoints();
    if (architecture || !selectedModule) return;
    const items = filteredEndpoints(selectedModule);
    const methods = ["GET", "POST", "PATCH", "DELETE"].filter((method) =>
      items.some(({ item }) => item.method === method),
    );
    const columnGap = 2.4;
    const firstX = -((methods.length - 1) * columnGap) / 2;
    const methodColumns = new Map(
      methods.map((method, column) => [method, firstX + column * columnGap]),
    );
    const methodRows = new Map(methods.map((method) => [method, 0]));

    methods.forEach((method) => {
      const heading = makeLabel(method, "", 150);
      heading.scale.multiplyScalar(0.62);
      heading.position.set(methodColumns.get(method), 2.25, 0.12);
      endpointGroup.add(heading);
    });

    items.forEach(({ item, index }) => {
      const row = methodRows.get(item.method);
      methodRows.set(item.method, row + 1);
      const x = methodColumns.get(item.method);
      const y = 1.45 - row * 0.82;
      const z = row % 2 === 0 ? 0.12 : -0.04;
      const geometry = new RoundedBoxGeometry(2.2, 0.68, 0.38, 4, 0.09),
        material = new THREE.MeshStandardMaterial({
          color: COLORS[item.method],
          roughness: 0.65,
          metalness: 0.05,
          transparent: true,
          opacity: index === selectedEndpoint ? 1 : 0.8,
        });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData = { kind: "endpoint", item, index };
      endpointGroup.add(mesh);
      endpointMeshes.set(index, mesh);
      interactives.push(mesh);
      const label = makeLabel(
        `${item.method} · ${endpointLabel(item.summary)}`,
        "",
        360,
      );
      label.scale.multiplyScalar(0.72);
      label.position.copy(mesh.position).add(new THREE.Vector3(0, 0, 0.3));
      endpointGroup.add(label);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 3.45, 0),
        mesh.position,
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: COLORS[item.method],
        transparent: true,
        opacity: index === selectedEndpoint ? 0.85 : 0.22,
      });
      endpointGroup.add(new THREE.Line(lineGeometry, lineMaterial));
    });
  }
  function animateCamera(position, target) {
    cancelAnimationFrame(animation);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      camera.position.copy(position);
      orbit.target.copy(target);
      orbit.update();
      render();
      return;
    }
    const from = camera.position.clone(),
      fromTarget = orbit.target.clone(),
      start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 320),
        ease = 1 - Math.pow(1 - p, 3);
      camera.position.lerpVectors(from, position, ease);
      orbit.target.lerpVectors(fromTarget, target, ease);
      camera.lookAt(orbit.target);
      render();
      if (p < 1) animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
  }
  function fit() {
    const portrait = canvas.clientWidth / canvas.clientHeight < 1;
    animateCamera(
      new THREE.Vector3(
        0,
        0.3,
        architecture ? (portrait ? 28 : 19) : portrait ? 20 : 15,
      ),
      new THREE.Vector3(0, -0.35, 0),
    );
  }
  function applyMode() {
    moduleMeshes.forEach(({ mesh, label }, id) => {
      const active = selectedModule?.id === id;
      mesh.visible = architecture || active;
      label.visible = architecture || active;
      if (architecture) {
        mesh.position.copy(mesh.userData.home);
        label.position.copy(label.userData.home);
      } else if (active) {
        mesh.position.set(0, 3.55, 0);
        label.position.set(0, 3.55, 0.45);
      }
      mesh.material.color.setHex(active ? COLORS.accent : COLORS.surface);
    });
    connectionGroup.visible = architecture;
    rebuildEndpoints();
    $("[data-api-mode]").textContent = architecture
      ? "VISTA ARQUITECTURA"
      : "VISTA DE MÓDULO";
    render();
  }
  function selectEndpoint(index, { focus = false } = {}) {
    if (!selectedModule?.endpoints[index]) return;
    selectedEndpoint = index;
    architecture = false;
    renderList();
    updateContract();
    rebuildEndpoints();
    const button = endpointList.querySelector(
      `[data-endpoint-index="${index}"]`,
    );
    button?.scrollIntoView({ block: "nearest" });
    if (focus) button?.focus();
    $("[data-api-selection]").textContent =
      `${selectedModule.name} / ${selectedModule.endpoints[index].method} ${selectedModule.endpoints[index].path}`;
    updateUrl();
    render();
  }
  function selectModule(id, { restoreEndpoint = null } = {}) {
    const module = API_MODULES.find((m) => m.id === id);
    if (!module) return;
    selectedModule = module;
    architecture = false;
    const matches = filteredEndpoints(module);
    selectedEndpoint = restoreEndpoint ?? matches[0]?.index ?? 0;
    $$("[data-api-id]").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.apiId === id)),
    );
    $("[data-api-level]").textContent =
      `${module.level} · ${module.endpoints.length} endpoints`;
    $("[data-api-title]").textContent = module.name;
    $("[data-api-purpose]").textContent = module.purpose;
    $("[data-api-flow]").textContent = module.flow;
    renderList();
    updateContract();
    applyMode();
    $("[data-api-selection]").textContent = module.name;
    updateUrl();
    fit();
  }
  function showArchitecture() {
    architecture = true;
    selectedModule = null;
    contract.hidden = true;
    $$("[data-api-id]").forEach((b) => b.setAttribute("aria-pressed", "false"));
    $("[data-api-level]").textContent = "Arquitectura completa · 11 módulos";
    $("[data-api-title]").textContent = "Mapa de dependencias";
    $("[data-api-purpose]").textContent =
      "La lectura sigue el flujo real desde componentes y stock hasta operaciones, automatización e informes.";
    $("[data-api-flow]").textContent =
      "Componentes → Stock → Órdenes → Vehículos → Montaje → Historial / Dashboard → Informes";
    $("[data-api-selection]").textContent = "Arquitectura completa";
    renderList();
    applyMode();
    updateUrl();
    fit();
  }
  function applyFilters() {
    const modules = filteredModules();
    $$("[data-api-id]").forEach(
      (button) =>
        (button.hidden = !modules.some((m) => m.id === button.dataset.apiId)),
    );
    moduleMeshes.forEach(({ mesh, label }, id) => {
      if (architecture) {
        const show =
          modules.some((m) => m.id === id) &&
          (!search.value ||
            API_MODULES.find((m) => m.id === id).endpoints.some((e) =>
              `${e.path} ${e.summary}`
                .toLowerCase()
                .includes(search.value.toLowerCase()),
            ));
        mesh.visible = show;
        label.visible = show;
      }
    });
    const total = modules.reduce(
      (sum, m) => sum + filteredEndpoints(m).length,
      0,
    );
    $("[data-api-count]").textContent =
      `${total} ${total === 1 ? "resultado" : "resultados"}`;
    if (selectedModule) {
      const matches = filteredEndpoints(selectedModule);
      if (matches.length && !matches.some((x) => x.index === selectedEndpoint))
        selectedEndpoint = matches[0].index;
      renderList();
      updateContract();
      rebuildEndpoints();
    }
    render();
  }
  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(interactives.filter((o) => o.visible))[0]
      ?.object;
  }
  controls.addEventListener("click", (e) => {
    const b = e.target.closest("[data-api-id]");
    if (b) selectModule(b.dataset.apiId);
  });
  endpointList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-endpoint-index]");
    if (b) selectEndpoint(Number(b.dataset.endpointIndex));
  });
  canvas.addEventListener("pointermove", (e) => {
    const object = hit(e);
    canvas.style.cursor = object ? "pointer" : "grab";
    if (!object) {
      tooltip.hidden = true;
      return;
    }
    tooltip.hidden = false;
    tooltip.textContent =
      object.userData.kind === "module"
        ? `${object.userData.module.name} · ${object.userData.module.endpoints.length} endpoints`
        : `${object.userData.item.method} ${object.userData.item.path}`;
    const rect = stage.getBoundingClientRect();
    tooltip.style.left = `${Math.min(rect.width - 270, Math.max(12, e.clientX - rect.left + 14))}px`;
    tooltip.style.top = `${Math.max(46, e.clientY - rect.top - 34)}px`;
  });
  canvas.addEventListener("pointerleave", () => (tooltip.hidden = true));
  canvas.addEventListener("click", (e) => {
    const object = hit(e);
    if (object?.userData.kind === "module") selectModule(object.userData.id);
    if (object?.userData.kind === "endpoint")
      selectEndpoint(object.userData.index);
  });
  root.addEventListener("click", async (e) => {
    const copy = e.target.closest("[data-api-copy]");
    if (!copy) return;
    const item = selectedModule?.endpoints[selectedEndpoint];
    const value =
      copy.dataset.apiCopy === "path"
        ? item?.path
        : copy.dataset.apiCopy === "request"
          ? $("[data-api-contract-request]").textContent
          : $("[data-api-contract-response]").textContent;
    try {
      await navigator.clipboard.writeText(value || "");
      copy.textContent = "Copiado";
      setTimeout(
        () =>
          (copy.textContent =
            copy.dataset.apiCopy === "path" ? "Copiar ruta" : "Copiar"),
        1200,
      );
    } catch {
      copy.textContent = "Usa Ctrl+C";
    }
  });
  $("[data-api-reset]").addEventListener("click", showArchitecture);
  $("[data-api-fit]").addEventListener("click", fit);
  $("[data-api-clear]").addEventListener("click", () => {
    search.value = "";
    methodFilter.value = "ALL";
    levelFilter.value = "ALL";
    applyFilters();
  });
  [search, methodFilter, levelFilter].forEach((el) =>
    el.addEventListener(el === search ? "input" : "change", applyFilters),
  );
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      showArchitecture();
    }
  });
  $$("[data-camera]").forEach((button) =>
    button.addEventListener("click", () => {
      const action = button.dataset.camera;
      if (action === "in" || action === "out") {
        camera.position.multiplyScalar(action === "in" ? 0.9 : 1.1);
      } else {
        const delta = 0.7;
        orbit.target.x +=
          action === "left" ? -delta : action === "right" ? delta : 0;
        orbit.target.y +=
          action === "down" ? -delta : action === "up" ? delta : 0;
      }
      orbit.update();
      render();
    }),
  );
  const observer = new ResizeObserver(() => {
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  });
  observer.observe(stage);
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (!visible) cancelAnimationFrame(animation);
    else render();
  });
  const params = new URLSearchParams(location.search),
    api = params.get("api"),
    endpoint = params.get("endpoint");
  if (api) {
    const module = API_MODULES.find((m) => m.id === api),
      index = module?.endpoints.findIndex(
        (e) =>
          (e.path.split("/").filter(Boolean).at(-1)?.replace(/[{}]/g, "") ||
            "") === endpoint,
      );
    selectModule(api, { restoreEndpoint: index >= 0 ? index : 0 });
  } else showArchitecture();
  applyFilters();
}
