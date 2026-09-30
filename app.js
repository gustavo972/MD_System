const DEFAULT_DATA = [
  {
    id: "dec-1",
    name: "Compra 20 kg",
    scenarios: [
      { id: "sc-1-1", name: "Sol", probability: 60, cost: -70, revenue: 98 },
      { id: "sc-1-2", name: "Chuva", probability: 40, cost: -70, revenue: 98 }
    ]
  },
  {
    id: "dec-2",
    name: "Compra 40 kg",
    scenarios: [
      { id: "sc-2-1", name: "Sol", probability: 60, cost: -140, revenue: 196 },
      { id: "sc-2-2", name: "Chuva", probability: 40, cost: -140, revenue: 140 }
    ]
  },
  {
    id: "dec-3",
    name: "Compra 60 kg",
    scenarios: [
      { id: "sc-3-1", name: "Sol", probability: 60, cost: -210, revenue: 294 },
      { id: "sc-3-2", name: "Chuva", probability: 40, cost: -210, revenue: 140 }
    ]
  },
  {
    id: "dec-4",
    name: "Compra 80 kg",
    scenarios: [
      { id: "sc-4-1", name: "Sol", probability: 60, cost: -280, revenue: 350 },
      { id: "sc-4-2", name: "Chuva", probability: 40, cost: -280, revenue: 140 }
    ]
  }
];

let appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
let activeDecisionId = null;
let modalScenarios = [];

function formatBRL(value) {
  if (value === undefined || value === null || isNaN(value)) return "R$ 0,00";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calculateScenarioProfit(scenario) {
  const cost = parseFloat(scenario.cost) || 0;
  const revenue = parseFloat(scenario.revenue) || 0;
  return revenue + cost;
}

function getDecisionProbabilitySum(decision) {
  if (!decision.scenarios || decision.scenarios.length === 0) return 0;
  return decision.scenarios.reduce((sum, sc) => sum + (parseFloat(sc.probability) || 0), 0);
}

function calculateDecisionEV(decision) {
  if (!decision.scenarios || decision.scenarios.length === 0) return 0;
  return decision.scenarios.reduce((sum, sc) => {
    const prob = (parseFloat(sc.probability) || 0) / 100;
    const profit = calculateScenarioProfit(sc);
    return sum + (prob * profit);
  }, 0);
}

function updateApp() {
  renderTree();
  renderSummary();
  requestAnimationFrame(drawTreeLines);
}

function renderTree() {
  const container = document.getElementById("treeRootContainer");
  const statusMsg = document.getElementById("treeStatusMessage");
  if (!container) return;

  let hasInvalidProbabilities = false;

  let html = `
    <div class="root-node-box" id="nodeRoot">
      Decisão
    </div>
    <div class="decisions-list" id="decisionsList">
  `;

  appData.forEach(decision => {
    const probSum = Math.round(getDecisionProbabilitySum(decision) * 10) / 10;
    const isValid = probSum === 100;
    if (!isValid) hasInvalidProbabilities = true;

    const ev = calculateDecisionEV(decision);

    html += `
      <div class="decision-block" id="block-${decision.id}">
        <div class="decision-node" id="node-${decision.id}">
          <div class="decision-node-top">
            <span class="decision-node-title">${escapeHtml(decision.name)}</span>
            <div class="decision-node-actions">
              <button type="button" class="btn-action" onclick="openModal('${decision.id}')">Editar</button>
              <button type="button" class="btn-action btn-delete" onclick="deleteDecision('${decision.id}')">Excluir</button>
            </div>
          </div>
          <div class="decision-node-ev">
            <span>Valor esperado:</span>
            <strong>${formatBRL(ev)}</strong>
          </div>
          ${!isValid ? `<span class="decision-node-error">Probabilidades: ${probSum}%</span>` : ''}
        </div>

        <div class="scenarios-list" id="scenarios-${decision.id}">
          ${decision.scenarios.map(sc => {
            const profit = calculateScenarioProfit(sc);
            const profitClass = profit >= 0 ? 'val-positive' : 'val-negative';

            return `
              <div class="scenario-node" id="node-sc-${sc.id}">
                <div class="scenario-node-top">
                  <span>${escapeHtml(sc.name)}</span>
                  <span class="scenario-prob">${sc.probability}%</span>
                </div>
                <div class="scenario-values">
                  <span>Custo: ${formatBRL(sc.cost)}</span>
                  <span>Receita: ${formatBRL(sc.revenue)}</span>
                </div>
                <div class="scenario-profit">
                  <span>Lucro:</span>
                  <span class="${profitClass}">${formatBRL(profit)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  if (statusMsg) {
    statusMsg.textContent = hasInvalidProbabilities ? "Atenção: uma ou mais decisões não totalizam 100% de probabilidade." : "";
  }
}

function drawTreeLines() {
  const svg = document.getElementById("treeSvg");
  const wrapper = document.getElementById("treeWrapper");
  const rootNode = document.getElementById("nodeRoot");

  if (!svg || !wrapper || !rootNode) return;

  const wrapRect = wrapper.getBoundingClientRect();
  const width = wrapper.offsetWidth;
  const height = wrapper.offsetHeight;

  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  let paths = "";

  const rootRect = rootNode.getBoundingClientRect();
  const rootX = rootRect.right - wrapRect.left;
  const rootY = rootRect.top + (rootRect.height / 2) - wrapRect.top;

  appData.forEach(decision => {
    const decNode = document.getElementById(`node-${decision.id}`);
    if (!decNode) return;

    const decRect = decNode.getBoundingClientRect();
    const decStartX = decRect.left - wrapRect.left;
    const decStartY = decRect.top + (decRect.height / 2) - wrapRect.top;
    const decEndX = decRect.right - wrapRect.left;
    const decEndY = decStartY;

    const midX = rootX + (decStartX - rootX) / 2;
    paths += `<path d="M ${rootX} ${rootY} L ${midX} ${rootY} L ${midX} ${decStartY} L ${decStartX} ${decStartY}" class="tree-line" />`;

    decision.scenarios.forEach(sc => {
      const scNode = document.getElementById(`node-sc-${sc.id}`);
      if (!scNode) return;

      const scRect = scNode.getBoundingClientRect();
      const scStartX = scRect.left - wrapRect.left;
      const scStartY = scRect.top + (scRect.height / 2) - wrapRect.top;

      const scMidX = decEndX + (scStartX - decEndX) / 2;
      paths += `<path d="M ${decEndX} ${decEndY} L ${scMidX} ${decEndY} L ${scMidX} ${scStartY} L ${scStartX} ${scStartY}" class="tree-line" />`;
    });
  });

  svg.innerHTML = paths;
}

function renderSummary() {
  const tbody = document.getElementById("summaryTableBody");
  if (!tbody) return;

  tbody.innerHTML = appData.map(decision => {
    const probSum = Math.round(getDecisionProbabilitySum(decision) * 10) / 10;
    const isValid = probSum === 100;
    const ev = calculateDecisionEV(decision);

    return `
      <tr>
        <td><strong>${escapeHtml(decision.name)}</strong></td>
        <td>${decision.scenarios ? decision.scenarios.length : 0} cenários</td>
        <td>
          <span class="${isValid ? 'badge-valid' : 'badge-invalid'}">
            ${isValid ? '100% (Válido)' : `${probSum}% (Inválido)`}
          </span>
        </td>
        <td class="text-right">
          <strong>${formatBRL(ev)}</strong>
        </td>
      </tr>
    `;
  }).join('');
}

function openModal(decisionId = null) {
  activeDecisionId = decisionId;
  const modal = document.getElementById("decisionModal");
  const modalTitle = document.getElementById("modalTitle");
  const nameInput = document.getElementById("decisionNameInput");

  if (!modal) return;

  if (decisionId) {
    const dec = appData.find(d => d.id === decisionId);
    if (!dec) return;
    modalTitle.textContent = "Editar Decisão";
    nameInput.value = dec.name;
    modalScenarios = JSON.parse(JSON.stringify(dec.scenarios || []));
  } else {
    modalTitle.textContent = "Nova Decisão";
    nameInput.value = "";
    modalScenarios = [
      { id: `sc-${Date.now()}-1`, name: "Cenário 1", probability: 50, cost: -50, revenue: 100 },
      { id: `sc-${Date.now()}-2`, name: "Cenário 2", probability: 50, cost: -50, revenue: 50 }
    ];
  }

  renderModalTable();
  modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("decisionModal");
  if (modal) modal.classList.remove("active");
  activeDecisionId = null;
  modalScenarios = [];
}

function renderModalTable() {
  const tbody = document.getElementById("modalScenariosTableBody");
  if (!tbody) return;

  tbody.innerHTML = modalScenarios.map((sc, index) => {
    const profit = (parseFloat(sc.revenue) || 0) + (parseFloat(sc.cost) || 0);
    const profitClass = profit >= 0 ? 'val-positive' : 'val-negative';

    return `
      <tr>
        <td>
          <input type="text" class="input-table" value="${escapeHtml(sc.name)}" 
            oninput="handleScenarioInput(${index}, 'name', this.value)" required>
        </td>
        <td>
          <input type="number" class="input-table" min="0" max="100" step="any" value="${sc.probability}" 
            oninput="handleScenarioInput(${index}, 'probability', this.value)" required>
        </td>
        <td>
          <input type="number" class="input-table" step="any" value="${sc.cost}" 
            oninput="handleScenarioInput(${index}, 'cost', this.value)" required>
        </td>
        <td>
          <input type="number" class="input-table" step="any" value="${sc.revenue}" 
            oninput="handleScenarioInput(${index}, 'revenue', this.value)" required>
        </td>
        <td class="table-profit-cell ${profitClass}">
          ${formatBRL(profit)}
        </td>
        <td>
          ${modalScenarios.length > 1 ? `
            <button type="button" class="btn-remove-row" onclick="removeScenarioRow(${index})" title="Excluir cenário">&times;</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  updateModalCalculations();
}

function handleScenarioInput(index, field, value) {
  if (!modalScenarios[index]) return;
  modalScenarios[index][field] = value;
  renderModalTable();
}

function addScenarioRow() {
  modalScenarios.push({
    id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: "Novo Cenário",
    probability: 0,
    cost: 0,
    revenue: 0
  });
  renderModalTable();
}

function removeScenarioRow(index) {
  modalScenarios.splice(index, 1);
  renderModalTable();
}

function updateModalCalculations() {
  const probIndicator = document.getElementById("probSumIndicator");
  const warningAlert = document.getElementById("probWarningAlert");
  const evText = document.getElementById("modalCalculatedEV");

  let totalProb = 0;
  let ev = 0;

  modalScenarios.forEach(sc => {
    const prob = parseFloat(sc.probability) || 0;
    const cost = parseFloat(sc.cost) || 0;
    const rev = parseFloat(sc.revenue) || 0;
    const profit = rev + cost;

    totalProb += prob;
    ev += (prob / 100) * profit;
  });

  const roundedProb = Math.round(totalProb * 10) / 10;
  const isValid = roundedProb === 100;

  if (probIndicator) {
    probIndicator.textContent = `Total: ${roundedProb}%`;
    probIndicator.className = `prob-sum-indicator ${isValid ? 'valid' : 'invalid'}`;
  }

  if (warningAlert) {
    warningAlert.style.display = isValid ? "none" : "block";
  }

  if (evText) {
    evText.textContent = formatBRL(ev);
  }
}

function saveDecision(e) {
  e.preventDefault();
  const nameInput = document.getElementById("decisionNameInput");
  const name = nameInput.value.trim();

  if (!name) {
    nameInput.focus();
    return;
  }

  if (modalScenarios.length === 0) {
    alert("Adicione ao menos um cenário.");
    return;
  }

  const cleanScenarios = modalScenarios.map(sc => ({
    id: sc.id || `sc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: (sc.name || "Cenário").trim(),
    probability: parseFloat(sc.probability) || 0,
    cost: parseFloat(sc.cost) || 0,
    revenue: parseFloat(sc.revenue) || 0
  }));

  if (activeDecisionId) {
    const item = appData.find(d => d.id === activeDecisionId);
    if (item) {
      item.name = name;
      item.scenarios = cleanScenarios;
    }
  } else {
    appData.push({
      id: `dec-${Date.now()}`,
      name: name,
      scenarios: cleanScenarios
    });
  }

  closeModal();
  updateApp();
}

function deleteDecision(id) {
  const dec = appData.find(d => d.id === id);
  if (!dec) return;

  if (confirm(`Excluir a alternativa "${dec.name}"?`)) {
    appData = appData.filter(d => d.id !== id);
    updateApp();
  }
}

function resetExample() {
  if (confirm("Restaurar dados originais do exercício?")) {
    appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    updateApp();
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnNewDecision")?.addEventListener("click", () => openModal());
  document.getElementById("btnResetExample")?.addEventListener("click", resetExample);
  document.getElementById("btnCloseModal")?.addEventListener("click", closeModal);
  document.getElementById("btnCancelModal")?.addEventListener("click", closeModal);
  document.getElementById("btnAddScenarioRow")?.addEventListener("click", addScenarioRow);
  document.getElementById("decisionForm")?.addEventListener("submit", saveDecision);

  document.getElementById("decisionModal")?.addEventListener("click", (e) => {
    if (e.target.id === "decisionModal") closeModal();
  });

  window.addEventListener("resize", drawTreeLines);

  updateApp();
});
