// index.js
import { app } from './firebase-config.js'; // Importa o app do arquivo de configuração
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const db = getFirestore(app);

let rodadas = [];
let rodadaAtual = 0;
let times = [];
const tabelaContainer = document.querySelector("#tabela tbody");

// Variáveis para armazenar as funções de "unsubscribe" dos listeners
let unsubscribeTimes = null;
let unsubscribeRodadas = null;

window.anteriorRodada = function() {
  console.log("anteriorRodada clicado. Rodada atual:", rodadaAtual);
  if (rodadaAtual > 0) {
    rodadaAtual--;
    mostrarRodada();
  }
}

window.proximaRodada = function() {
  console.log("proximaRodada clicado. Rodada atual:", rodadaAtual);
  if (rodadaAtual < rodadas.length - 1) {
    rodadaAtual++;
    mostrarRodada();
  }
}

// --- FUNÇÃO DE CARREGAMENTO DE TIMES EM TEMPO REAL ---
async function carregarTimesEmTempoReal() {
  console.log("Configurando listener para times...");
  // Cancela o listener anterior se existir
  if (unsubscribeTimes) {
    unsubscribeTimes();
  }

  // Configura o novo listener
  unsubscribeTimes = onSnapshot(collection(db, "times"), (snapshot) => {
    times = snapshot.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome,
      iconeURL: doc.data().iconeURL
    }));
    console.log("Times atualizados (tempo real):", times.length);
    // Após atualizar os times, recarrega as rodadas para garantir a consistência
    // e recalcula a tabela (se já houver rodadas carregadas)
    if (rodadas.length > 0) {
      atualizarTabela();
      mostrarRodada(); // Re-renderiza a rodada atual com os novos dados de times
    }
  }, (error) => {
    console.error("Erro ao carregar times em tempo real:", error);
  });
}

// --- FUNÇÃO DE CARREGAMENTO DE RODADAS EM TEMPO REAL ---
async function carregarRodadasEmTempoReal() {
  console.log("Configurando listener para rodadas...");
  // Cancela o listener anterior se existir
  if (unsubscribeRodadas) {
    unsubscribeRodadas();
  }

  // Configura o novo listener
  unsubscribeRodadas = onSnapshot(collection(db, "rodadas"), (snapshot) => {
    rodadas = snapshot.docs.map(doc => ({
      numero: parseInt(doc.id.replace("rodada", "")),
      jogos: doc.data().jogos
    })).sort((a, b) => a.numero - b.numero);
    console.log("Rodadas atualizadas (tempo real):", rodadas.length);

    let ultimaRodadaComResultado = 0;
    for (let i = rodadas.length - 1; i >= 0; i--) {
        const rodada = rodadas[i];
        const temResultado = rodada.jogos.some(jogo =>
            jogo.golsA !== undefined && jogo.golsA !== null &&
            jogo.golsB !== undefined && jogo.golsB !== null
        );
        if (temResultado) {
            ultimaRodadaComResultado = i;
            break;
        }
    }
    rodadaAtual = ultimaRodadaComResultado;

    atualizarTabela();
    mostrarRodada();
  }, (error) => {
    console.error("Erro ao carregar rodadas em tempo real:", error);
  });
}

function inicializarTabela() {
  let tabela = {};
  times.forEach(time => {
    tabela[time.id] = {
      nome: time.nome,
      iconeURL: time.iconeURL,
      PTS: 0, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0
    };
  });
  return tabela;
}

function atualizarTabela() {
  console.log("Atualizando tabela...");
  let tabelaCalculada = inicializarTabela();
  rodadas.forEach(rod => {
    rod.jogos.forEach(jogo => {
      if (jogo.golsA !== undefined && jogo.golsA !== null &&
          jogo.golsB !== undefined && jogo.golsB !== null) {

        const golsA = parseInt(jogo.golsA);
        const golsB = parseInt(jogo.golsB);

        if (!isNaN(golsA) && !isNaN(golsB)) {
          const timeA = tabelaCalculada[jogo.timeA];
          const timeB = tabelaCalculada[jogo.timeB];

          if (!timeA || !timeB) {
              console.warn(`Time não encontrado para jogo: ${jogo.timeA} ou ${jogo.timeB}`);
              return;
          }

          timeA.J++; timeB.J++;
          timeA.GP += golsA;
          timeA.GC += golsB;
          timeB.GP += golsB;
          timeB.GC += golsA;

          if (golsA > golsB) {
            timeA.V++; timeB.D++; timeA.PTS += 3;
          } else if (golsA < golsB) {
            timeB.V++; timeA.D++; timeB.PTS += 3;
          } else {
            timeA.E++; timeB.E++; timeA.PTS += 1; timeB.PTS += 1;
          }
        } else {
            console.warn(`Gols inválidos (não numéricos) para jogo: ${jogo.timeA} x ${jogo.timeB}. Não computado na tabela.`);
        }
      }
    });
  });
  renderizarTabela(tabelaCalculada);
  console.log("Tabela atualizada.");
}

function renderizarTabela(tabelaData) {
  console.log("Renderizando tabela...");
  const lista = Object.values(tabelaData);
  lista.forEach(t => {
    t.SG = t.GP - t.GC;
    let percentual = (t.J && t.PTS !== undefined && t.J !== 0) ? ((t.PTS / (t.J * 3)) * 100) : 0;
    t['%'] = Math.round(percentual).toString();
  });
  lista.sort((a, b) => b.PTS - a.PTS || b.V - a.V || b.SG - a.SG);

  tabelaContainer.innerHTML = "";
  if (lista.length === 0) {
    tabelaContainer.innerHTML = `<tr><td colspan="11">Nenhum dado de tabela disponível.</td></tr>`;
    return;
  }

  lista.forEach((time, index) => {
    const posClass = `pos-${index + 1}`;
    tabelaContainer.innerHTML += `
      <tr>
        <td class='posicao ${posClass}'>${index + 1}</td>
        <td><div class="tabela-time"><img src="${time.iconeURL || `img/icones/${time.nome}.png`}" class="icone-time">${time.nome}</div></td>
        <td>${time.PTS}</td><td>${time.J}</td><td>${time.V}</td><td>${time.E}</td><td>${time.D}</td><td>${time.GP}</td><td>${time.GC}</td><td>${time.SG}</td><td>${time['%']}%</td>
      </tr>`;
  });
  console.log("Tabela renderizada.");
}

function mostrarRodada() {
  const container = document.getElementById("lista-jogos");
  container.innerHTML = "";
  if (rodadaAtual === -1 || !rodadas[rodadaAtual]) {
    document.getElementById("rodada-titulo").textContent = "Nenhuma Rodada Encontrada";
    console.warn("Nenhuma rodada para mostrar ou rodadaAtual inválida.");
    return;
  }

  const rodada = rodadas[rodadaAtual];
  document.getElementById("rodada-titulo").textContent = `${rodada.numero}ª RODADA`;
  console.log(`Mostrando ${rodada.numero}ª Rodada...`);

  rodada.jogos.forEach(jogo => {
    const div = document.createElement("div");
    div.className = "jogo-novo";

    const dataOriginal = new Date(jogo.data);
    const ano = dataOriginal.getUTCFullYear();
    const mes = dataOriginal.getUTCMonth();
    const dia = dataOriginal.getUTCDate();
    const dataParaExibir = new Date(ano, mes, dia);
    const dataFormatada = dataParaExibir.toLocaleDateString('pt-BR');

    const timeA = times.find(t => t.id === jogo.timeA) || { nome: jogo.timeA, iconeURL: `img/icones/default.png` };
    const timeB = times.find(t => t.id === jogo.timeB) || { nome: jogo.timeB, iconeURL: `img/icones/default.png` };
    const iconeA = timeA.iconeURL || `img/icones/${timeA.nome}.png`;
    const iconeB = timeB.iconeURL || `img/icones/${timeB.nome}.png`;

    div.innerHTML = `
      <div class="jogo-cabecalho">${dataFormatada} • ${jogo.hora}</div>
      <div class="jogo-conteudo alinhado">
        <div class="time">
          <img src="${iconeA}" alt="${timeA.nome}" class="icone-time">
          <span class="nome-time">${timeA.nome}</span>
        </div>
        <div class="placar">
          <span class="gols">${jogo.golsA ?? "-"}</span>
          <span>x</span>
          <span class="gols">${jogo.golsB ?? "-"}</span>
        </div>
        <div class="time">
          <img src="${iconeB}" alt="${timeB.nome}" class="icone-time">
          <span class="nome-time">${timeB.nome}</span>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
  console.log(`Rodada ${rodada.numero} renderizada.`);
}

// --- FUNÇÃO DE INICIALIZAÇÃO QUE AGORA ATIVA OS LISTENERS ---
(async () => {
  // Primeiramente, configura o listener para times
  await carregarTimesEmTempoReal();
  // Em seguida, configura o listener para rodadas
  // O listener de rodadas irá disparar a primeira atualização da tabela
  await carregarRodadasEmTempoReal();
  console.log("Inicialização de listeners completa.");
  console.log("Funções de navegação acessíveis:", typeof window.anteriorRodada === 'function', typeof window.proximaRodada === 'function');
})();

// Opcional: Para limpar os listeners quando o usuário sai da página (boa prática)
window.addEventListener('beforeunload', () => {
    if (unsubscribeTimes) {
        unsubscribeTimes();
        console.log("Listener de times desinscrito.");
    }
    if (unsubscribeRodadas) {
        unsubscribeRodadas();
        console.log("Listener de rodadas desinscrito.");
    }
});