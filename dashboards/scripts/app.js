/*
  App principal do Dashboard de Vendas
  - Login Google (GIS) com allowlist
  - Leitura do Google Sheets (colunas M:Q)
  - KPIs e gráficos (Chart.js)
*/

(function initApp() {
  const cfg = window.APP_CONFIG;
  if (!cfg) { console.error("APP_CONFIG ausente"); return; }

  const statusContainer = null;
  const statusEl = { textContent: '' };
  const refreshBtn = document.getElementById("refresh-btn");
  const kpisSection = document.getElementById("kpis");
  const chartsSection = document.getElementById("charts");
  const tableWrap = document.getElementById("table-wrap");
  const periodBadge = document.getElementById("period-badge");
  const periodBtn = document.getElementById("period-btn");
  const periodPanel = document.getElementById("period-panel");
  const periodStart = document.getElementById("period-start");
  const periodEnd = document.getElementById("period-end");
  const periodApply = document.getElementById("period-apply");
  const periodReset = document.getElementById("period-reset");
  const presetThisMonth = document.getElementById("preset-this-month");
  const presetLastMonth = document.getElementById("preset-last-month");
  // Filtro de cliente
  const clientBtn = document.getElementById('client-btn');
  const clientBadge = document.getElementById('client-badge');
  const clientPanel = document.getElementById('client-panel');
  const clientSearch = document.getElementById('client-search');
  const clientList = document.getElementById('client-list');
  const clientApply = document.getElementById('client-apply');
  const clientClear = document.getElementById('client-clear');
  const btnListQuase = document.getElementById('btn-list-quase');
  const btnListChurn = document.getElementById('btn-list-churn');
  const btnListAtivos = document.getElementById('btn-list-ativos');
  const btnListNovos = document.getElementById('btn-list-novos');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-title');
  const landing = document.getElementById("landing");
  const appRoot = document.getElementById("app");
  const loading = document.getElementById("loading");

  // Novos elementos de KPIs enxutos
  const el = (id) => document.getElementById(id);
  const kpiFatValor = el("kpi-fat-valor");
  const kpiFatVar = el("kpi-fat-var");
  const kpiFatProj = el("kpi-fat-proj");
  const kpiFatProjLabel = el("kpi-fat-proj-label");

  const kpiPedValor = el("kpi-ped-valor");
  const kpiPedVar = el("kpi-ped-var");
  const kpiPedProj = el("kpi-ped-proj");
  const kpiPedProjLabel = el("kpi-ped-proj-label");

  const kpiTicketValor = el("kpi-ticket-valor");
  const kpiTicketVar = el("kpi-ticket-var");

  const kpiClientesValor = el("kpi-clientes-valor");
  const kpiClientesVar = el("kpi-clientes-var");

  const kpiYtdTitle = el("kpi-ytd-title");
  const kpiYtdValor = el("kpi-ytd-valor");
  const kpiYtdVar = el("kpi-ytd-var");
  const kpiYtdProj = el("kpi-ytd-proj");
  const kpiYtdProjLabel = el("kpi-ytd-proj-label");

  let userEmail = null;
  let tokenClient = null;
  let accessToken = null;
  let charts = { semanas: null, clientes: null };
  let autoFetchPending = false;
  const STORAGE_EMAIL_KEY = "vp_user_email";
  let currentPeriod = { start: null, end: null };
  let clientFilter = new Set(); // vazio = todos

  // Função de modal acessível em todo o app (fora do onload)
  function openModal(title, rows) {
    if (!modal) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = rows.map(r=>`<tr><td>${r.cliente}</td><td>${new Date(r.last).toLocaleDateString('pt-BR')}</td><td>${formatK(r.total)}</td></tr>`).join('');
    modal.classList.remove('hidden');
  }

  function setStatus(_) {}
  function toCurrencyBRL(value) { return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function formatK(value) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    const thousands = value / 1000;
    const decimals = thousands >= 100 ? 0 : thousands >= 10 ? 1 : 2;
    const str = thousands.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${str}k`;
  }
  function setTextById(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
  function parseJwt(jwt) { return JSON.parse(atob(jwt.split(".")[1])); }

  function gateAfterLogin() {
    const allowed = cfg.ALLOWLIST.length === 0 || cfg.ALLOWLIST.includes(userEmail);
    if (!allowed) {
      setStatus(`Acesso negado para ${userEmail}`);
      if (refreshBtn) refreshBtn.disabled = true;
      return false;
    }
    setStatus(`Logado como ${userEmail}`);
    if (refreshBtn) refreshBtn.disabled = false;
    return true;
  }

  // Função para configurar modo demonstração no iOS
  function setupIOSDemo() {
    // Registrar plugin de datalabels se existir
    try { if (window.Chart && window.ChartDataLabels) { window.Chart.register(window.ChartDataLabels); } } catch(_) {}
    
    // Mostrar aviso de demo para iOS
    const iosNotice = document.getElementById('ios-demo-notice');
    const regularLoginBtn = document.getElementById('gsi-btn-landing');
    if (iosNotice) {
      iosNotice.style.display = 'block';
      if (regularLoginBtn) regularLoginBtn.style.display = 'none';
    }
    
    // Configurar botão de demo
    const demoBtn = document.getElementById('btn-ios-demo');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        // Simula usuário logado
        userEmail = 'demo@valepan.com';
        
        // Esconde landing e mostra app
        if (landing) landing.hidden = true;
        if (appRoot) appRoot.hidden = false;
        if (periodBtn) periodBtn.hidden = false;
        if (clientBtn) clientBtn.hidden = false;
        
        showLoading(true);
        
        // Gera dados de demonstração e renderiza
        generateDemoData().then(() => {
          showLoading(false);
        }).catch(err => {
          console.error('Erro ao gerar dados demo:', err);
          showLoading(false);
          alert('Erro ao carregar demonstração');
        });
      });
    }
  }

  // Função para gerar dados de demonstração
  async function generateDemoData() {
    console.log('Gerando dados de demonstração...');
    
    // Dados fictícios para demonstração
    const demoRows = generateDemoRows();
    
    // Popular painel de clientes
    if (clientList && clientList.childElementCount === 0) {
      const allClients = Array.from(new Set(demoRows.map(r => r.cliente))).sort();
      clientList.innerHTML = allClients.map(name => 
        `<li data-name="${name}"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" value="${name}"><span>${name}</span></label></li>`
      ).join('');
      if (clientBtn) clientBtn.hidden = false;
    }
    
    const period = computePeriod(demoRows);
    periodBadge.textContent = `Período: ${period.badge} (DEMO)`;
    
    // Mantém período atual
    currentPeriod.start = period.curStart;
    currentPeriod.end = period.curEnd;
    
    renderKPIs({ ...period.kpis }, period.meta);
    renderCharts(period);
    renderTable(period.rowsAtual);
    setStatus(`Dados demo carregados (${period.rowsAtual.length} registros).`);
    
    // Renderizar insights
    renderInsights(period);
  }

  // Função para gerar dados fictícios realistas
  function generateDemoRows() {
    const clientes = [
      'Padaria Central', 'Café da Esquina', 'Mercado Bom Preço', 'Restaurante Sabor', 'Lanchonete Popular',
      'Padaria do Bairro', 'Supermercado Norte', 'Bistrô Gourmet', 'Café Premium', 'Mercadinho Familiar',
      'Restaurante Tradição', 'Padaria Nova', 'Loja de Conveniência', 'Bar do João', 'Pizzaria Italiana'
    ];
    
    const rows = [];
    const hoje = new Date();
    
    // Gera dados dos últimos 3 meses
    for (let dias = 90; dias >= 0; dias--) {
      const data = new Date(hoje.getTime() - dias * 24 * 60 * 60 * 1000);
      
      // Skip domingos (menos vendas)
      if (data.getDay() === 0) continue;
      
      // Número aleatório de vendas por dia (1-8)
      const vendasDia = Math.floor(Math.random() * 8) + 1;
      
      for (let v = 0; v < vendasDia; v++) {
        const cliente = clientes[Math.floor(Math.random() * clientes.length)];
        // Valores entre R$ 50 e R$ 1500 com distribuição mais realista
        const valor = 50 + Math.floor(Math.random() * 1450) + Math.floor(Math.random() * 500);
        
        rows.push({
          data: new Date(data.getTime() + v * 60000), // Pequeno offset para diferenciar
          cliente,
          valor,
          anoMes: `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, '0')}`
        });
      }
    }
    
    return rows;
  }

  // Função helper para renderizar insights
  function renderInsights(period) {
    // Insights (será implementado usando a mesma lógica do código original)
    const nr = period.novosRecorrentes;
    const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;
    
    setTextById('nr-novos-valor', formatK(nr.novos.valor));
    setTextById('nr-novos-ped', (nr.novos.pedidos || 0).toLocaleString('pt-BR'));
    setTextById('nr-novos-pct', fmtPct(nr.novos.pct));
    setTextById('nr-rec-valor', formatK(nr.recorrentes.valor));
    setTextById('nr-rec-ped', (nr.recorrentes.pedidos || 0).toLocaleString('pt-BR'));
    setTextById('nr-rec-pct', fmtPct(nr.recorrentes.pct));
    
    // Rankings
    const upEl = document.getElementById('rank-up');
    const dnEl = document.getElementById('rank-down');
    if (upEl) upEl.innerHTML = '';
    if (dnEl) dnEl.innerHTML = '';
    
    for (const r of period.rankUp) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${r.cliente}</span><span>+${formatK(r.delta)} (${Math.round(r.pct || 0)}%)</span>`;
      if (upEl) upEl.appendChild(li);
    }
    
    for (const r of period.rankDown) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${r.cliente}</span><span>${formatK(r.delta)} (${Math.round(r.pct || 0)}%)</span>`;
      if (dnEl) dnEl.appendChild(li);
    }
    
    // Engajamento
    const eng = period.engajamento;
    setTextById('eng-ativos', eng.ativos);
    setTextById('eng-quase', eng.quase);
    setTextById('eng-churn', eng.churn);
    setTextById('eng-freq', eng.freqMedia.toFixed(1));
    
    // Mostrar todas as seções
    if (kpisSection) kpisSection.hidden = false;
    if (chartsSection) chartsSection.hidden = false;
    if (tableWrap) tableWrap.hidden = false;
    document.getElementById('insights').hidden = false;
  }

  // Inicializa Google Identity Services
  window.onload = () => {
    if (!cfg.CLIENT_ID || cfg.CLIENT_ID.startsWith("COLOQUE_SEU_CLIENT_ID")) setStatus("Defina CLIENT_ID em config.js");

    // Detecção robusta do iOS
    const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                  /iPhone|iPad|iPod|iOS/i.test(navigator.userAgent);

    // Se for iOS, pula autenticação e vai direto para o dashboard
    if (isIOS) {
      console.log('iOS detectado - ativando modo demonstração');
      setupIOSDemo();
      return;
    }

    function initGIS() {
      if (!(window.google && google.accounts && google.accounts.id)) { setTimeout(initGIS, 150); return; }
      // Registrar plugin de datalabels se existir
      try { if (window.Chart && window.ChartDataLabels) { window.Chart.register(window.ChartDataLabels); } } catch(_) {}
      // ID token para recuperar e-mail do usuário
      const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
      google.accounts.id.initialize({
        client_id: cfg.CLIENT_ID,
        auto_select: !isLocal,
        use_fedcm_for_prompt: !isLocal,
        callback: (resp) => {
          try {
            const payload = parseJwt(resp.credential);
            userEmail = payload.email;
            try { localStorage.setItem(STORAGE_EMAIL_KEY, userEmail); } catch(_) {}
            const allowed = gateAfterLogin();
            if (allowed) {
              // Esconde landing imediatamente e mostra o app com overlay
              if (landing) landing.hidden = true; 
              if (appRoot) appRoot.hidden = false; 
              if (statusContainer) statusContainer.hidden = false;
              if (periodBtn) periodBtn.hidden = false;
              if (clientBtn) clientBtn.hidden = false;
              showLoading(true);
              autoFetchPending = true;
              if (tokenClient) tokenClient.requestAccessToken({ prompt: "", hint: userEmail });
              else setStatus("Login realizado. Preparando leitura...");
            }
          } catch (e) {
            setStatus("Falha ao processar login");
          }
        }
      });
      // Botão na landing
      const host = document.getElementById("gsi-btn-landing");
      if (host) {
        google.accounts.id.renderButton(host, { theme: "outline", size: "large", text: "signin_with", shape: "pill" });
      }
      // Código para iOS foi removido - agora usa modo demonstração direto
      // Sugere login imediatamente quando já há sessão Google
      try { if (!isLocal) google.accounts.id.prompt(); } catch(_) {}
    }
    initGIS();
    // Botão redundante (header), caso queira permitir re-login
    // Botão extra no header (opcional)
    try {
      const headerBtnHost = document.createElement("div");
      headerBtnHost.id = "gsi-btn";
      document.querySelector(".auth-area")?.appendChild(headerBtnHost);
      if (window.google?.accounts?.id) {
        google.accounts.id.renderButton(headerBtnHost, { theme: "outline", size: "medium" });
      }
    } catch(_) {}

    // Access token para Sheets API
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cfg.CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly openid email profile",
      callback: (tokenResponse) => {
        // Reset dos botões iOS se estiverem em uso
        const btnStep2 = document.getElementById('btn-login-ios-step2');
        if (btnStep2 && btnStep2.textContent === 'Carregando...') {
          btnStep2.textContent = 'Autorizar dados (iOS - Passo 2)';
          btnStep2.disabled = false;
        }
        
        console.log('Token obtido com sucesso:', !!tokenResponse.access_token);
        accessToken = tokenResponse.access_token;
        setStatus("Carregando dados...");
        fetchAndRender().finally(()=>showLoading(false));
      },
      error_callback: (error) => {
        console.error('Erro no tokenClient:', error);
        // Reset dos botões iOS em caso de erro
        const btnStep2 = document.getElementById('btn-login-ios-step2');
        if (btnStep2) {
          btnStep2.textContent = 'Autorizar dados (iOS - Passo 2)';
          btnStep2.disabled = false;
        }
        alert('Erro na autorização: ' + (error.message || 'Erro desconhecido'));
      }
    });
    // Se o usuário já logou e permitiu, faça a leitura automática
    if (autoFetchPending) {
      tokenClient.requestAccessToken({ prompt: "", hint: userEmail || undefined });
    }

    // Removido botão de carregar dados do layout
    if (refreshBtn) refreshBtn.remove();

    // UI do filtro de período
    periodBtn?.addEventListener('click', ()=>{
      // Preenche os inputs com o período atualmente selecionado sempre que abrir
      if (periodPanel.hidden && currentPeriod.start && currentPeriod.end) {
        periodStart.value = toISODateInput(currentPeriod.start);
        periodEnd.value = toISODateInput(currentPeriod.end);
      }
      periodPanel.hidden = !periodPanel.hidden;
    });

    // Painel de cliente
    clientBtn?.addEventListener('click', ()=>{
      clientPanel.hidden = !clientPanel.hidden;
      if (!clientPanel.hidden) clientSearch.focus();
    });
    clientSearch?.addEventListener('input', ()=> {
      for (const li of clientList.querySelectorAll('li')) {
        const name = li.getAttribute('data-name')||'';
        li.style.display = name.toLowerCase().includes(clientSearch.value.toLowerCase()) ? '' : 'none';
      }
    });
    clientApply?.addEventListener('click', ()=>{
      const checked = Array.from(clientList.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value);
      clientFilter = new Set(checked);
      clientBadge.textContent = clientFilter.size>0 ? `Clientes: ${clientFilter.size}` : 'Clientes: Todos';
      clientPanel.hidden = true; showLoading(true); fetchAndRender().finally(()=> showLoading(false));
    });
    clientClear?.addEventListener('click', ()=>{
      clientFilter.clear();
      for (const cb of clientList.querySelectorAll('input[type="checkbox"]')) cb.checked = false;
      clientBadge.textContent = 'Clientes: Todos';
      clientPanel.hidden = true; showLoading(true); fetchAndRender().finally(()=> showLoading(false));
    });
    function toISODateInput(d){
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    }
    presetThisMonth?.addEventListener('click', ()=>{
      const now = new Date();
      const isFirstDay = now.getDate() === 1;
      // Início: primeiro dia do mês atual (ou do mês passado se hoje for dia 1)
      const start = isFirstDay
        ? new Date(now.getFullYear(), now.getMonth()-1, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      // Fim: ontem (se for dia 1, ontem é último dia do mês anterior)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1);
      periodStart.value = toISODateInput(start);
      periodEnd.value = toISODateInput(end);
    });
    presetLastMonth?.addEventListener('click', ()=>{
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0); // último dia do mês passado
      periodStart.value = toISODateInput(start);
      periodEnd.value = toISODateInput(end);
    });
    // Parser seguro (local) para yyyy-mm-dd, evitando offset de timezone
    function parseDateLocalFromInput(iso) {
      if (!iso || typeof iso !== 'string') return null;
      const [y, m, d] = iso.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }
    periodApply?.addEventListener('click', ()=>{
      try {
        const s = periodStart.value ? parseDateLocalFromInput(periodStart.value) : null;
        const e = periodEnd.value ? parseDateLocalFromInput(periodEnd.value) : null;
        if (s && e && s>e) { alert('Data inicial deve ser menor que final'); return; }
        customPeriod.start = s; customPeriod.end = e; periodPanel.hidden = true; showLoading(true); fetchAndRender().finally(()=>showLoading(false));
      } catch(_){}
    });
    periodReset?.addEventListener('click', ()=>{
      customPeriod = { start:null, end:null }; periodStart.value=''; periodEnd.value=''; periodPanel.hidden=true; showLoading(true); fetchAndRender().finally(()=>showLoading(false));
    });

    // Modal handlers
    modalClose?.addEventListener('click', ()=> modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e)=> { if (e.target === modal) modal.classList.add('hidden'); });
  };
  let customPeriod = { start: null, end: null };

  async function fetchSheetValues(spreadsheetId, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.values || [];
  }

  function normalizeRows(values) {
    // Esperado: colunas [M..Q] -> [NF Valida, AnoMes, Data, Cliente, Valor]
    const header = values[0] || [];
    const dataRows = values.slice(1);
    const rows = [];

    for (const r of dataRows) {
      const [nfValida, anoMes, dataStr, cliente, valorStr] = [r[0], r[1], r[2], r[3], r[4]];
      if (nfValida && nfValida.toString().toUpperCase() !== "TRUE") continue; // somente NF válida
      if (!dataStr || !cliente || !valorStr) continue;

      // Data pode vir como dd/mm/aaaa
      let data; 
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        const [d, m, y] = dataStr.split("/").map(Number);
        data = new Date(y, m - 1, d);
      } else {
        const asDate = new Date(dataStr);
        if (!isNaN(asDate)) data = asDate; else continue;
      }

      // Valor pode vir com separador BR (1.234,56)
      const numeric = parseFloat(String(valorStr).replace(/\./g, "").replace(/,/g, "."));
      if (!isFinite(numeric)) continue;

      const nomeCliente = String(cliente).trim();
      if (clientFilter && clientFilter.size>0 && !clientFilter.has(nomeCliente)) continue;
      rows.push({ data, anoMes: String(anoMes || `${data.getFullYear()}${String(data.getMonth()+1).padStart(2,'0')}`), cliente: nomeCliente, valor: numeric });
    }
    return rows;
  }

  function computeKPIs(rows) {
    const total = rows.reduce((acc, r) => acc + r.valor, 0);
    const pedidos = rows.length;
    const clientes = new Set(rows.map(r => r.cliente)).size;
    return { total, pedidos, clientes };
  }

  function getPeriodBoundaries(rows) {
    // Última data com venda
    const lastDate = new Date(Math.max(...rows.map(r => r.data.getTime())));
    const periodDay = lastDate.getDate();
    const currentMonthStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
    const currentMonthEnd = new Date(lastDate.getFullYear(), lastDate.getMonth(), periodDay, 23, 59, 59, 999);
    const prevMonthStart = new Date(lastDate.getFullYear(), lastDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(lastDate.getFullYear(), lastDate.getMonth() - 1, periodDay, 23, 59, 59, 999);
    return { lastDate, periodDay, currentMonthStart, currentMonthEnd, prevMonthStart, prevMonthEnd };
  }

  function groupByClient(rows) {
    const map = new Map();
    for (const r of rows) map.set(r.cliente, (map.get(r.cliente) || 0) + r.valor);
    return Array.from(map.entries()).sort((a,b) => b[1]-a[1]);
  }

  function renderKPIs(kpis, meta) {
    const varPct = kpis.totalAnterior === 0 ? 0 : (kpis.totalAtual - kpis.totalAnterior) / kpis.totalAnterior * 100;
    const cmpLabel = meta.compareLabel || 'mês anterior';
    // Card 1: Faturamento
    kpiFatValor.textContent = formatK(kpis.totalAtual);
    kpiFatVar.innerHTML = `<span class="${varPct>=0?'pos':'neg'}">${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%</span> vs ${cmpLabel}`;
    if (meta.showProjection && meta.projFat != null) {
    kpiFatProjLabel.textContent = `Projeção ${meta.nomeMes}`;
      kpiFatProj.textContent = formatK(meta.projFat);
    } else {
      kpiFatProjLabel.textContent = `Projeção`;
      kpiFatProj.textContent = '—';
    }

    // Card 2: Pedidos
    const pedidosAnterior = meta.pedidosAnterior || 0;
    const varPed = pedidosAnterior === 0 ? 0 : (kpis.pedidosAtual - pedidosAnterior)/pedidosAnterior*100;
    kpiPedValor.textContent = kpis.pedidosAtual.toLocaleString("pt-BR");
    kpiPedVar.innerHTML = `<span class="${varPed>=0?'pos':'neg'}">${varPed >= 0 ? '+' : ''}${varPed.toFixed(1)}%</span> vs ${cmpLabel}`;
    if (meta.showProjection && meta.projPed != null) {
    kpiPedProjLabel.textContent = `Projeção ${meta.nomeMes}`;
      kpiPedProj.textContent = Math.round(meta.projPed).toLocaleString('pt-BR');
    } else {
      kpiPedProjLabel.textContent = `Projeção`;
      kpiPedProj.textContent = '—';
    }

    // Card 3: Ticket
    const ticketAtual = kpis.pedidosAtual ? (kpis.totalAtual / kpis.pedidosAtual) : 0;
    const ticketAnterior = pedidosAnterior ? (kpis.totalAnterior / pedidosAnterior) : 0;
    const varTicket = ticketAnterior === 0 ? 0 : (ticketAtual - ticketAnterior)/ticketAnterior*100;
    kpiTicketValor.textContent = formatK(ticketAtual);
    kpiTicketVar.innerHTML = `<span class="${varTicket>=0?'pos':'neg'}">${varTicket >= 0 ? '+' : ''}${varTicket.toFixed(1)}%</span> vs ${cmpLabel}`;

    // Card 4: Clientes únicos
    const clientesAnterior = meta.clientesAnterior || 0;
    const varClientes = clientesAnterior === 0 ? 0 : (kpis.clientesAtual - clientesAnterior)/clientesAnterior*100;
    kpiClientesValor.textContent = kpis.clientesAtual.toLocaleString("pt-BR");
    kpiClientesVar.innerHTML = `<span class="${varClientes>=0?'pos':'neg'}">${varClientes >= 0 ? '+' : ''}${varClientes.toFixed(1)}%</span> vs ${cmpLabel}`;

    // Card 5: YTD
    kpiYtdTitle.textContent = `Faturamento ${meta.anoAtual}`;
    kpiYtdValor.textContent = formatK(kpis.ytd || 0);
    const ytdPrev = meta.ytdPrev || 0; const yoyPct = ytdPrev===0?0:((kpis.ytd||0)-ytdPrev)/ytdPrev*100;
    kpiYtdVar.innerHTML = `<span class="${yoyPct>=0?'pos':'neg'}">${yoyPct>=0?'+':''}${yoyPct.toFixed(1)}%</span> vs ${meta.anoAnterior}`;
    const projAno = meta.avgDiarioYTD * meta.daysInYear;
    kpiYtdProjLabel.textContent = `Projeção ${meta.anoAtual}`;
    kpiYtdProj.textContent = formatK(projAno);

    kpisSection.hidden = false;
  }

  function renderTable(rows) {
    const tbody = document.querySelector("#sales-table tbody");
    tbody.innerHTML = "";
    const sorted = [...rows].sort((a,b) => b.data - a.data);
    for (const r of sorted) {
      const tr = document.createElement("tr");
      const tdData = document.createElement("td");
      tdData.textContent = r.data.toLocaleDateString("pt-BR");
      const tdCli = document.createElement("td");
      tdCli.textContent = r.cliente;
      const tdVal = document.createElement("td");
      tdVal.className = "amount";
      tdVal.textContent = toCurrencyBRL(r.valor);
      tr.replaceChildren(tdData, tdCli, tdVal);
      tbody.appendChild(tr);
    }
    // Filtro de busca por cliente (instantâneo)
    try {
      const search = document.getElementById('sales-search');
      if (search && !search._bound) {
        search._bound = true;
        search.addEventListener('input', ()=>{
          const term = search.value.trim().toLowerCase();
          const rowsEl = Array.from(tbody.querySelectorAll('tr'));
          if (!term) { rowsEl.forEach(tr=> tr.style.display=''); return; }
          rowsEl.forEach(tr=>{
            const name = (tr.children[1]?.textContent || '').toLowerCase();
            tr.style.display = name.includes(term) ? '' : 'none';
          });
        });
      }
    } catch(_) {}
    tableWrap.hidden = false;
  }

  function renderCharts(period) {
    // Gráfico por semanas: últimas 4 vs 5–8
    const { weeks } = period;
    if (charts.semanas) charts.semanas.destroy();
    const semCanvas = document.getElementById("chart-semanas");
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    charts.semanas = new Chart(semCanvas, {
      type: "bar",
      data: { labels: weeks.labels, datasets: [
        { label: "Faturamento", data: weeks.totals, backgroundColor: "#6da8ff", yAxisID: 'y', borderRadius: 8, borderSkipped: 'bottom' }
      ] },
      options: { 
        responsive: true, 
        layout: { padding: { top: 28, right: 8, left: 8, bottom: 8 } }, 
        plugins: { 
          legend: { display: false }, 
          subtitle: { display: true, text: 'Clique nas barras para filtrar o período', color: '#9fb0c7', font: { size: 11, weight: '600' }, padding: { bottom: 6 } },
          tooltip: { callbacks: { label: (ctx) => `Faturamento: ${formatK(ctx.parsed.y)}` } }, 
          datalabels: { clamp: true, clip: false, formatter: (v)=> formatK(v), color: '#cfe2ff', anchor: 'end', align: 'end', offset: -2 } 
        }, 
        scales: { 
          y: { grace: '10%', ticks: { callback: v => formatK(v) } },
          x: { grid: { display: false }, ticks: { display: !isMobile } }
        } 
      }
    });

    // Click-to-filter: ao clicar numa barra, ajusta período para a semana correspondente
    semCanvas.style.cursor = 'pointer';
    semCanvas.onclick = (evt) => {
      const points = charts.semanas.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
      if (!points || points.length === 0) return;
      const index = points[0].index;
      // Recupera label dd/mm–dd/mm e converte para datas
      const label = weeks.labels[index] || '';
      const [from, to] = label.split('–');
      if (!from || !to) return;
      const [df, mf] = from.split('/').map(Number);
      const [dt, mt] = to.split('/').map(Number);
      // Usa ano do período atual (curEnd) para montar datas
      const baseYear = (period.curEnd || new Date()).getFullYear();
      const start = new Date(baseYear, (mf||1)-1, df||1);
      const end = new Date(baseYear, (mt||1)-1, dt||1);
      // Atualiza inputs do painel e refaz busca
      try { if (periodStart && periodEnd) { periodStart.value = toISODateInput(start); periodEnd.value = toISODateInput(end); } } catch(_) {}
      customPeriod.start = start; customPeriod.end = end;
      showLoading(true); fetchAndRender().finally(()=> showLoading(false));
    };

    // Top clientes (período atual) – gráfico de rosca (Top 5 + "Outros")
    // Atualiza título com período selecionado
    try {
      const h3 = document.getElementById('title-top-clientes');
      if (h3) {
        const from = `${String(period.curStart.getDate()).padStart(2,'0')}/${String(period.curStart.getMonth()+1).padStart(2,'0')}`;
        const to = `${String(period.curEnd.getDate()).padStart(2,'0')}/${String(period.curEnd.getMonth()+1).padStart(2,'0')}`;
        h3.textContent = `Top clientes (${from} à ${to})`;
      }
    } catch(_) {}
    // Top clientes (rosca Top 5 + Outros)
    const allCli = groupByClient(period.rowsAtual);
    const top5 = allCli.slice(0, 5);
    const outrosSum = allCli.slice(5).reduce((s, [,v]) => s + v, 0);
    const labelsCli = top5.map(([c]) => c).concat(outrosSum > 0 ? ['Outros'] : []);
    const dataCli = top5.map(([,v]) => v).concat(outrosSum > 0 ? [outrosSum] : []);
    const totalPeriodo = (period.kpis.totalAtual || 0) || (dataCli.reduce((a,b)=>a+b,0) || 1);
    const cliCanvas = document.getElementById('chart-clientes');
    const legendUl = document.getElementById('topcli-legend');
    if (charts.clientes) charts.clientes.destroy();
    // usar o tamanho controlado via CSS
    cliCanvas.removeAttribute('width'); cliCanvas.removeAttribute('height');
    const colors = ['#e67e22', '#f1b666', '#6ea7ff', '#1cc4a2', '#ff6b6b', '#9fb0c7'].slice(0, labelsCli.length);
    charts.clientes = new Chart(cliCanvas, {
      type: 'doughnut',
      data: { labels: labelsCli, datasets: [{ data: dataCli, backgroundColor: colors, borderWidth: 0 }] },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { 
          legend: { display: false }, 
          subtitle: { display: true, text: 'Clique para filtrar por cliente (Top 5 + Outros)', color: '#9fb0c7', font: { size: 11, weight: '600' } },
          tooltip: { callbacks: { label: (ctx) => {
            const v = ctx.parsed; const pct = (v/totalPeriodo*100)||0;
            return `${ctx.label}: ${formatK(v)} (${pct.toFixed(1)}%)`;
          } } }, 
          datalabels: {
            color: '#eaf1ff',
            font: { weight: '800', size: 11 },
            textStrokeColor: 'rgba(10,14,20,.45)',
            textStrokeWidth: 3,
            formatter: (v) => { const pct = (v/totalPeriodo*100)||0; return pct < 6 ? '' : `${pct.toFixed(1)}%`; },
            anchor: 'center', align: 'center', clamp: true
          }
        }
      }
    });
    // Interação: clique na rosca filtra por cliente
    cliCanvas.style.cursor = 'pointer';
    cliCanvas.onclick = (evt)=>{
      const elements = charts.clientes.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
      if (!elements || elements.length===0) return;
      const idx = elements[0].index;
      const label = labelsCli[idx];
      if (!label) return;
      // Se for 'Outros', abre painel de clientes; para um cliente específico aplica filtro direto
      if (label === 'Outros') { clientBtn?.click(); return; }
      clientFilter = new Set([label]);
      if (clientBadge) clientBadge.textContent = `Clientes: 1`;
      showLoading(true); fetchAndRender().finally(()=> showLoading(false));
    };
    // Monta legenda com nome + valor + %
    if (legendUl) {
      legendUl.innerHTML = '';
      labelsCli.forEach((label, i) => {
        const value = dataCli[i] || 0; const pct = ((value/totalPeriodo)*100)||0;
        const li = document.createElement('li');
        li.innerHTML = `<span class=\"dot\" style=\"background:${colors[i]}\"></span><span style=\"font-weight:700;color:#eaf1ff\">${label}</span><span style=\"margin-left:auto;color:#b8c7e0\">${formatK(value)} (${pct.toFixed(1)}%)</span>`;
        li.addEventListener('click', ()=>{
          if (label === 'Outros') { clientBtn?.click(); return; }
          clientFilter = new Set([label]); if (clientBadge) clientBadge.textContent = `Clientes: 1`;
          showLoading(true); fetchAndRender().finally(()=> showLoading(false));
        });
        legendUl.appendChild(li);
      });
    }

    chartsSection.hidden = false;
  }

  function computePeriod(rows) {
    const b = getPeriodBoundaries(rows);
    // Se houver filtro customizado, usa-o; senão utiliza regra padrão
    const curStart = customPeriod.start || b.currentMonthStart;
    const curEnd = customPeriod.end || b.currentMonthEnd;
    const msDay = 24*60*60*1000;
    // Período anterior com mesmo dia/intervalo
    // Período anterior: mês anterior por padrão. Se seleção aparenta ser uma semana (7 dias) e não inicia em dia 1,
    // comparar com a semana imediatamente anterior
    let prevStart = new Date(curStart.getFullYear(), curStart.getMonth()-1, curStart.getDate());
    let prevEnd = new Date(curEnd.getFullYear(), curEnd.getMonth()-1, curEnd.getDate(), 23,59,59,999);
    let compareLabel = 'mês anterior';
    const diffDays = Math.floor((curEnd - curStart)/(24*60*60*1000));
    if (curStart.getDate() !== 1 && diffDays === 6) {
      prevStart = new Date(curStart.getFullYear(), curStart.getMonth(), curStart.getDate()-13);
      prevEnd = new Date(curStart.getFullYear(), curStart.getMonth(), curStart.getDate()-7, 23,59,59,999);
      compareLabel = 'semana anterior';
    }
    const rowsAtual = rows.filter(r => r.data >= curStart && r.data <= curEnd);
    const rowsAnterior = rows.filter(r => r.data >= prevStart && r.data <= prevEnd);

    const totalAtual = rowsAtual.reduce((a, r) => a + r.valor, 0);
    const totalAnterior = rowsAnterior.reduce((a, r) => a + r.valor, 0);
    const pedidosAtual = rowsAtual.length;
    const clientesAtual = new Set(rowsAtual.map(r => r.cliente)).size;

    // Run-rate (projeção pelo ritmo médio diário)
    const daysInMonth = new Date(curStart.getFullYear(), curStart.getMonth()+1, 0).getDate();
    const curDays = Math.max(1, Math.ceil((curEnd - new Date(curStart.getFullYear(), curStart.getMonth(), 1)) / (24*60*60*1000)) + 1);
    // Projeção pela regra solicitada
    const prevFullStart = new Date(curStart.getFullYear(), curStart.getMonth()-1, 1);
    const prevFullEnd = new Date(curStart.getFullYear(), curStart.getMonth(), 0, 23,59,59,999);
    const rowsPrevFull = rows.filter(r => r.data >= prevFullStart && r.data <= prevFullEnd);
    const prevFullTotal = rowsPrevFull.reduce((a,r)=>a+r.valor,0);
    const prevFullOrders = rowsPrevFull.length;
    const nowRef = new Date();
    const showProjection = curStart.getDate() === 1 && curStart.getMonth() === nowRef.getMonth() && curStart.getFullYear() === nowRef.getFullYear();
    const projFat = (showProjection && totalAnterior>0) ? totalAtual * (prevFullTotal / totalAnterior) : null;
    const projPed = (showProjection && rowsAnterior.length>0) ? pedidosAtual * (prevFullOrders / rowsAnterior.length) : null;

    // YTD e YoY
    const startYTD = new Date(curEnd.getFullYear(), 0, 1);
    const endYTD = curEnd;
    const startYTDPrev = new Date(curEnd.getFullYear()-1, 0, 1);
    const endYTDPrev = new Date(curEnd.getFullYear()-1, curEnd.getMonth(), curEnd.getDate(), 23,59,59,999);
    const ytd = rows.filter(r => r.data >= startYTD && r.data <= endYTD).reduce((a,r)=>a+r.valor,0);
    const ytdPrev = rows.filter(r => r.data >= startYTDPrev && r.data <= endYTDPrev).reduce((a,r)=>a+r.valor,0);
    const yoyPct = ytdPrev === 0 ? 0 : (ytd - ytdPrev) / ytdPrev * 100;

    const kpis = { totalAtual, totalAnterior, pedidosAtual, clientesAtual, ytd, yoyPct };

    // Séries por semana baseadas em [date-to] (curEnd)
    function formatDDMM(d){
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      return `${dd}/${mm}`;
    }
    const endRef = new Date(curEnd.getFullYear(), curEnd.getMonth(), curEnd.getDate(), 23,59,59,999);
    const weekLabels = [];
    const weekTotals = [];
    const weekTickets = [];
    for (let i = 0; i < 8; i++) {
      const wEnd = new Date(endRef.getTime() - i*7*msDay);
      const wStart = new Date(wEnd.getTime() - 6*msDay);
      weekLabels.unshift(`${formatDDMM(wStart)}–${formatDDMM(wEnd)}`);
      const rowsWeek = rows.filter(r => r.data >= new Date(wStart.getFullYear(), wStart.getMonth(), wStart.getDate()) && r.data <= wEnd);
      const totalW = rowsWeek.reduce((a,r)=>a+r.valor,0);
      const ordersW = rowsWeek.length;
      weekTotals.unshift(totalW);
      weekTickets.unshift(ordersW ? totalW/ordersW : 0);
    }
    const weeks = { labels: weekLabels, totals: weekTotals, tickets: weekTickets };

    // Novos vs recorrentes
    const firstPurchase = new Map();
    for (const r of rows) {
      const cur = firstPurchase.get(r.cliente);
      if (!cur || r.data < cur) firstPurchase.set(r.cliente, r.data);
    }
    const clientesPeriodo = new Set(rowsAtual.map(r=>r.cliente));
    let novosValor = 0, recValor = 0, novosPed=0, recPed=0;
    for (const c of clientesPeriodo) {
      const isNovo = firstPurchase.get(c) >= b.currentMonthStart && firstPurchase.get(c) <= b.currentMonthEnd;
      const valorCliente = rowsAtual.filter(r=>r.cliente===c).reduce((a,r)=>a+r.valor,0);
      const pedidosCliente = rowsAtual.filter(r=>r.cliente===c).length;
      if (isNovo) { novosValor+=valorCliente; novosPed+=pedidosCliente; }
      else { recValor+=valorCliente; recPed+=pedidosCliente; }
    }
    const novosRecorrentes = {
      novos: { valor: novosValor, pedidos: novosPed, pct: totalAtual ? (novosValor/totalAtual*100) : 0 },
      recorrentes: { valor: recValor, pedidos: recPed, pct: totalAtual ? (recValor/totalAtual*100) : 0 },
    };

    // Ranking variação por cliente (top 5 up/down)
    const sumByClient = (set) => {
      const m = new Map();
      for (const r of set) m.set(r.cliente, (m.get(r.cliente)||0)+r.valor);
      return m;
    };
    const curByCli = sumByClient(rowsAtual);
    const prevByCli = sumByClient(rowsAnterior);
    const allClients = new Set([...curByCli.keys(), ...prevByCli.keys()]);
    const variations = [];
    for (const c of allClients) {
      const cur = curByCli.get(c)||0; const prev = prevByCli.get(c)||0;
      const delta = cur - prev; const pct = prev===0 ? (cur>0?100:0) : (delta/prev*100);
      if (cur || prev) variations.push({ cliente:c, cur, prev, delta, pct });
    }
    variations.sort((a,b)=>b.delta-a.delta);
    const rankUp = variations.slice(0,5);
    const rankDown = variations.slice(-5).reverse();

    // Engajamento baseado em [date-to] (curEnd)
    // - Ativos: compras entre [date-to]-13 e [date-to]
    // - Quase inativo: entre [date-to]-27 e [date-to]-14 (exclusivo de Ativos)
    // - Inativos: entre [date-to]-55 e [date-to]-28 (exclusivo anterior)
    const endTo = new Date(curEnd.getFullYear(), curEnd.getMonth(), curEnd.getDate(), 23,59,59,999);
    const actStart = new Date(endTo.getTime() - 13*msDay);
    const quasiStart = new Date(endTo.getTime() - 27*msDay);
    const quasiEnd = new Date(endTo.getTime() - 14*msDay);
    const inaStart = new Date(endTo.getTime() - 55*msDay);
    const inaEnd = new Date(endTo.getTime() - 28*msDay);

    const rowsActive = rows.filter(r => r.data >= actStart && r.data <= endTo);
    // Novos: clientes cuja primeira compra na história ocorreu dentro do período selecionado (curStart..curEnd)
    const firstByClient = new Map();
    for (const r of rows) {
      const prev = firstByClient.get(r.cliente); if (!prev || r.data < prev) firstByClient.set(r.cliente, r.data);
    }
    const setNovos = new Set();
    for (const r of rowsAtual) {
      const first = firstByClient.get(r.cliente);
      if (first && first >= curStart && first <= curEnd) setNovos.add(r.cliente);
    }
    const rowsQuasiRange = rows.filter(r => r.data >= quasiStart && r.data <= quasiEnd);
    const rowsInactiveRange = rows.filter(r => r.data >= inaStart && r.data <= inaEnd);

    const setAtivos = new Set(rowsActive.map(r=>r.cliente));
    const setQuasiRange = new Set(rowsQuasiRange.map(r=>r.cliente));
    const setInactiveRange = new Set(rowsInactiveRange.map(r=>r.cliente));
    const setQuase = new Set(Array.from(setQuasiRange).filter(c=> !setAtivos.has(c)));
    const setInativos = new Set(Array.from(setInactiveRange).filter(c=> !setAtivos.has(c) && !setQuase.has(c)));

    // Ativos devem EXCLUIR os Novos
    const setAtivosSemNovos = new Set(Array.from(setAtivos).filter(c => !setNovos.has(c)));

    const ativos = setAtivosSemNovos.size;
    const quase = setQuase.size;
    const inativos = setInativos.size;

    // Métricas auxiliares simplificadas
    const lastByClient = new Map();
    for (const r of rows) {
      const prev = lastByClient.get(r.cliente); if (!prev || r.data>prev) lastByClient.set(r.cliente, r.data);
    }
    let recSum=0, recCount=0; for (const d of lastByClient.values()) { recSum += Math.floor((endTo - d)/msDay); recCount++; }
    const engajamento = { novos: setNovos.size, ativos, quase, churn: inativos, freqMedia: 0, recenciaMedia: recCount? (recSum/recCount):0 };

    const labelPeriodo = `${String(curStart.getDate()).padStart(2,'0')}/${String(curStart.getMonth()+1).padStart(2,'0')}–${String(curEnd.getDate()).padStart(2,'0')}/${String(curEnd.getMonth()+1).padStart(2,'0')}/${curEnd.getFullYear()}`;
    const labelAnterior = `${String(prevStart.getDate()).padStart(2,'0')}/${String(prevStart.getMonth()+1).padStart(2,'0')}–${String(prevEnd.getDate()).padStart(2,'0')}/${String(prevEnd.getMonth()+1).padStart(2,'0')}/${prevEnd.getFullYear()}`;
    const nomeMes = curStart.toLocaleDateString('pt-BR', { month: 'long' });
    const pedidosAnterior = rowsAnterior.length;
    const clientesAnterior = new Set(rowsAnterior.map(r=>r.cliente)).size;
    const daysInYear = new Date(b.lastDate.getFullYear(), 11, 31).getDate() + (new Date(b.lastDate.getFullYear(), 0, 1).getDate() === 1 ? 364 : 365 - 1); // simplificado
    const avgPedidosDiario = curDays > 0 ? rowsAtual.length / curDays : 0;
    const daysSinceYearStart = Math.floor((curEnd - new Date(curEnd.getFullYear(),0,1)) / (24*60*60*1000)) + 1;
    const avgDiarioYTD = daysSinceYearStart>0 ? (ytd / daysSinceYearStart) : 0;
    const meta = { nomeMes, anoAtual: curEnd.getFullYear(), anoAnterior: curEnd.getFullYear()-1, pedidosAnterior, clientesAnterior, daysInMonth, daysInYear: 365 + ( (new Date(curEnd.getFullYear(),1,29).getMonth()===1)?1:0 ), avgPedidosDiario, avgDiarioYTD, ytdPrev, showProjection, projFat, projPed, compareLabel, prevStart, prevEnd };

    return { rowsAtual, rowsAnterior, kpis, weeks, labels: { atual: labelPeriodo, anterior: labelAnterior }, badge: labelPeriodo, novosRecorrentes, rankUp, rankDown, engajamento, meta, curStart, curEnd, sets: { ativos: setAtivosSemNovos, quaseInativos: setQuase, inativos: setInativos, novos: setNovos } };
  }

  async function fetchAndRender() {
    try {
      // Auto-login pelo e-mail armazenado
      if (!userEmail) {
        try { const saved = localStorage.getItem(STORAGE_EMAIL_KEY); if (saved) { userEmail = saved; } } catch(_) {}
      }
      if (userEmail && landing && !landing.hidden) {
        if (landing) landing.hidden = true; 
        if (appRoot) appRoot.hidden = false; 
        if (statusContainer) statusContainer.hidden = false; 
        if (periodBtn) periodBtn.hidden = false;
        if (clientBtn) clientBtn.hidden = false; 
        showLoading(true);
      }
      const values = await fetchSheetValues(cfg.SPREADSHEET_ID, cfg.RANGE);
      if (!values.length) { setStatus("Sem dados na planilha."); return; }
      const rows = normalizeRows(values);
      if (!rows.length) { setStatus("Nenhuma linha válida."); return; }

      // Popular painel de clientes (uma vez)
      try {
        if (clientList && clientList.childElementCount === 0) {
          const all = Array.from(new Set(rows.map(r=>r.cliente))).sort((a,b)=> a.localeCompare(b));
          clientList.innerHTML = all.map(name=> `<li data-name="${name}"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" value="${name}"><span>${name}</span></label></li>`).join('');
          if (clientBtn) clientBtn.hidden = false;
        }
      } catch(_) {}

      const period = computePeriod(rows);
      periodBadge.textContent = `Período: ${period.badge}`;
      // Mantém período atual para reabrir o painel já preenchido
      currentPeriod.start = period.curStart;
      currentPeriod.end = period.curEnd;
      renderKPIs({ ...period.kpis }, period.meta);
      renderCharts(period);
      renderTable(period.rowsAtual);
      setStatus(`Dados carregados (${period.rowsAtual.length} registros).`);

      // Insights
      const nr = period.novosRecorrentes;
      const fmtPct = (n)=> `${(n||0).toFixed(1)}%`;
      setTextById('nr-novos-valor', formatK(nr.novos.valor));
      setTextById('nr-novos-ped', (nr.novos.pedidos||0).toLocaleString('pt-BR'));
      setTextById('nr-novos-pct', fmtPct(nr.novos.pct));
      setTextById('nr-rec-valor', formatK(nr.recorrentes.valor));
      setTextById('nr-rec-ped', (nr.recorrentes.pedidos||0).toLocaleString('pt-BR'));
      setTextById('nr-rec-pct', fmtPct(nr.recorrentes.pct));

      // Gráfico donuts para novos vs recorrentes
      const ctxNR = document.getElementById('chart-nr');
      if (ctxNR) {
        if (charts.nr) charts.nr.destroy?.();
        charts.nr = new Chart(ctxNR, {
          type: 'doughnut',
          data: { labels: ['Novos','Recorrentes'], datasets: [{ data: [nr.novos.valor, nr.recorrentes.valor], backgroundColor: ['#7bb0ff','#00d3a7'] }] },
          options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c)=> `${c.label}: ${formatK(c.parsed)}` } } } }
        });
      }

      const upEl = document.getElementById('rank-up');
      const dnEl = document.getElementById('rank-down');
      upEl.innerHTML = ''; dnEl.innerHTML = '';
      // Atualiza título com os períodos comparados (usando meta.prevStart/meta.prevEnd)
      try {
        const tv = document.getElementById('title-variacao');
        if (tv && period.meta) {
          const curFrom = `${String(period.curStart.getDate()).padStart(2,'0')}/${String(period.curStart.getMonth()+1).padStart(2,'0')}`;
          const curTo = `${String(period.curEnd.getDate()).padStart(2,'0')}/${String(period.curEnd.getMonth()+1).padStart(2,'0')}`;
          const ps = period.meta.prevStart; const pe = period.meta.prevEnd;
          if (ps && pe) {
            const prevFrom = `${String(ps.getDate()).padStart(2,'0')}/${String(ps.getMonth()+1).padStart(2,'0')}`;
            const prevTo = `${String(pe.getDate()).padStart(2,'0')}/${String(pe.getMonth()+1).padStart(2,'0')}`;
            tv.textContent = `Variação por cliente (${curFrom}–${curTo} vs ${prevFrom}–${prevTo})`;
          }
        }
      } catch(_) {}
      for (const r of period.rankUp) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${r.cliente}</span><span>+${formatK(r.delta)} (${Math.round(r.pct||0)}%)</span>`;
        li.addEventListener('click', ()=>{ clientFilter = new Set([r.cliente]); if (clientBadge) clientBadge.textContent = 'Clientes: 1'; showLoading(true); fetchAndRender().finally(()=>showLoading(false)); });
        upEl.appendChild(li);
      }
      for (const r of period.rankDown) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${r.cliente}</span><span>${formatK(r.delta)} (${Math.round(r.pct||0)}%)</span>`;
        li.addEventListener('click', ()=>{ clientFilter = new Set([r.cliente]); if (clientBadge) clientBadge.textContent = 'Clientes: 1'; showLoading(true); fetchAndRender().finally(()=>showLoading(false)); });
        dnEl.appendChild(li);
      }

      const eng = period.engajamento;
      setTextById('eng-ativos', eng.ativos);
      setTextById('eng-quase', eng.quase);
      setTextById('eng-churn', eng.churn);
      // Frequência média considerando janela recente e apenas ativos
      setTextById('eng-freq', eng.freqMedia.toFixed(1));
      const ctxEng = document.getElementById('chart-eng');
      if (ctxEng) {
        if (charts.eng) charts.eng.destroy?.();
        charts.eng = new Chart(ctxEng, {
          type: 'bar',
          data: { labels: ['Novos','Ativos','Quase inativo','Inativos'], datasets: [{ data: [eng.novos, eng.ativos, eng.quase, eng.churn], backgroundColor: ['#7bb0ff','#00d3a7','#ffb84d','#ff6b6b'], borderRadius: 8, borderSkipped: 'bottom' }] },
          options: { plugins: { legend: { display: false }, subtitle: { display: true, text: 'Clique nas barras para ver a lista de clientes', color: '#9fb0c7', font: { size: 11, weight: '600' } }, datalabels: { anchor: 'end', align: 'end', color: '#cfe2ff' }, tooltip: { callbacks: { title: (items)=> items.map(()=> 'Engajamento'), label: (ctx)=> `${ctx.label}: ${ctx.parsed.y}` } } }, scales: { y: { beginAtZero: true, grace: '15%', ticks: { precision:0 } } } }
        });
        ctxEng.style.cursor = 'pointer';
        ctxEng.onclick = (evt)=>{
          const points = charts.eng.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
          if (!points || points.length === 0) return;
          const idx = points[0].index;
          const buildMapTotalELast = (dataset)=>{
            const map = new Map();
            for (const r of rows) { const cur = map.get(r.cliente) || { total:0, last:new Date(0) }; cur.total += r.valor; if (r.data>cur.last) cur.last=r.data; map.set(r.cliente, cur); }
            return map;
          };
          const mapAll = buildMapTotalELast(rows);
          let setRef; let title;
          if (idx === 0) { setRef = period.sets.novos; title = 'Novos (primeira compra no período)'; }
          else if (idx === 1) { setRef = period.sets.ativos; title = 'Ativos (compraram no período)'; }
          else if (idx === 2) { setRef = period.sets.quaseInativos; title = 'Quase inativo (últimos 30 dias antes do período)'; }
          else { setRef = period.sets.inativos; title = 'Inativos (31–60 dias antes do período)'; }
          const list = Array.from(setRef || [])
            .map(c=> ({ cliente:c, total: mapAll.get(c)?.total||0, last: mapAll.get(c)?.last||new Date(0) }))
            .sort((a,b)=> b.last - a.last);
          openModal(title, list);
        };
      }
      // Removidos os botões – interação passou a ser por clique nas barras
      /*btnListNovos?.addEventListener('click', ()=>{
        const mapAll = buildMapTotalELast(rows);
        const list = Array.from(period.sets.novos || [])
          .map(c=> ({ cliente:c, total: mapAll.get(c)?.total||0, last: mapAll.get(c)?.last||new Date(0) }))
          .sort((a,b)=> b.last - a.last);
        openModal('Novos (primeira compra no período)', list);
      });
      // Botões para listar clientes
      function buildMapTotalELast(dataset){
        const map = new Map();
        for (const r of dataset) {
          const cur = map.get(r.cliente) || { total:0, last: new Date(0) };
          cur.total += r.valor; if (r.data > cur.last) cur.last = r.data; map.set(r.cliente, cur);
        }
        return map;
      }
      btnListAtivos?.addEventListener('click', ()=>{
        const rowsCur = period.rowsAtual;
        const mapAll = buildMapTotalELast(rowsCur);
        const list = Array.from(new Set(rowsCur.map(r=>r.cliente)))
          .map(c=> ({ cliente:c, total: mapAll.get(c)?.total||0, last: mapAll.get(c)?.last||new Date(0) }))
          .sort((a,b)=> b.last - a.last);
        openModal('Ativos (compraram no período)', list);
      });
      btnListQuase?.addEventListener('click', ()=>{
        const mapAll = buildMapTotalELast(rows);
        const list = Array.from(period.sets.quaseInativos || [])
          .map(c=> ({ cliente:c, total: mapAll.get(c)?.total||0, last: mapAll.get(c)?.last||new Date(0) }))
          .sort((a,b)=> b.last - a.last);
        openModal('Quase inativo (últimos 30 dias antes do período)', list);
      });
      btnListChurn?.addEventListener('click', ()=>{
        const mapAll = buildMapTotalELast(rows);
        const list = Array.from(period.sets.inativos || [])
          .map(c=> ({ cliente:c, total: mapAll.get(c)?.total||0, last: mapAll.get(c)?.last||new Date(0) }))
          .sort((a,b)=> b.last - a.last);
        openModal('Inativos (31–60 dias antes do período)', list);
      });*/

      document.getElementById('insights').hidden = false;
    } catch (err) {
      console.error(err);
      setStatus("Erro ao carregar dados: " + (err.message || String(err)));
    }
  }

  function showLoading(flag) { if (!loading) return; loading.classList.toggle("hidden", !flag); }
})();


