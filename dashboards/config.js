// Configure aqui e publique no GitHub Pages
// - CLIENT_ID: OAuth Web client do Google (GIS)
// - ALLOWLIST: e-mails que podem acessar
// - SPREADSHEET_ID e RANGE: planilha e intervalo a ler

window.APP_CONFIG = {
  CLIENT_ID: "558843850394-mvikbdpclrn3i9fqukek5qq3ar3pj657.apps.googleusercontent.com",
  ALLOWLIST: [
    "victor@valepan.com",
    "osir@valepan.com",
    "giselda@valepan.com",
    "fellipe@valepan.com",
  ],
  SPREADSHEET_ID: "1Wy43sOqHVKPTx7U634U9kYRDeANE-61kxpQm4-Bg9Xo",
  RANGE: "M:Q", // colunas M:Q (NF Válida, AnoMês, Data, Cliente, Valor)
  TOP_CLIENTES: 7 // quantos clientes exibir no gráfico
};


