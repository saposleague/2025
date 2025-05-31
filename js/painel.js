// js/painel.js
import { app } from './firebase-config.js'; // Importa o app do arquivo de configuração
import { getFirestore, collection, getDocs, getDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// --- VERIFICAÇÃO DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "admin.html";
  }
});
// --- FIM DA VERIFICAÇÃO DE AUTENTICAÇÃO ---

let nomesTimes = {};
let rodadasCarregadas = [];
let paginaAtual = 1;
const porPagina = 5;

const salvarJogoBtn = document.getElementById("salvar-jogo-button");
const logoutButton = document.getElementById("logout-button");

// Função de logout existente
if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "admin.html";
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            mostrarMensagem("Erro ao fazer logout. Tente novamente.");
        }
    });
}

// ----------------------------------------------------
// Lógica de logout ao fechar a janela/aba (já existente)
// ----------------------------------------------------
window.addEventListener('beforeunload', async (event) => {
    try {
        if (auth.currentUser) { // Verifica se há um usuário logado
            await signOut(auth);
            console.log("Usuário deslogado automaticamente ao fechar a janela/aba.");
        }
    } catch (error) {
        console.error("Erro ao deslogar automaticamente no fechamento:", error);
    }
});
// ----------------------------------------------------
// FIM DO BLOCO
// ----------------------------------------------------

async function carregarTimes() {
  const snap = await getDocs(collection(db, "times"));
  const selectA = document.getElementById("timeA");
  const selectB = document.getElementById("timeB");
  selectA.innerHTML = '<option value="">Selecione um time</option>';
  selectB.innerHTML = '<option value="">Selecione um time</option>';

  snap.forEach(doc => {
    nomesTimes[doc.id] = doc.data().nome;
    const optA = document.createElement("option");
    optA.value = doc.id;
    optA.textContent = doc.data().nome;
    selectA.appendChild(optA);

    const optB = document.createElement("option");
    optB.value = doc.id;
    optB.textContent = doc.data().nome;
    selectB.appendChild(optB);
  });
}

async function sugerirRodada() {
  const snap = await getDocs(collection(db, "rodadas"));
  let maior = 0;
  snap.forEach(doc => {
    const numero = parseInt(doc.id.replace("rodada", ""));
    if (numero > maior) maior = numero;
  });
  document.getElementById("rodada").value = maior + 1;
}

async function salvarJogo() {
  const rodadaNumForm = parseInt(document.getElementById("rodada").value);
  const data = document.getElementById("data").value;
  const hora = document.getElementById("hora").value;
  const timeA = document.getElementById("timeA").value;
  const golsAInput = document.getElementById("golsA").value;
  const timeB = document.getElementById("timeB").value;
  const golsBInput = document.getElementById("golsB").value;

  // Validações
  if (isNaN(rodadaNumForm) || rodadaNumForm < 1) {
      mostrarMensagem("Por favor, insira um número de rodada válido (maior ou igual a 1).");
      return;
  }
  if (!data || !hora) {
      mostrarMensagem("Por favor, preencha a data e a hora do jogo.");
      return;
  }
  if (!timeA || timeA === "" || !timeB || timeB === "") {
      mostrarMensagem("Por favor, selecione ambos os times.");
      return;
  }
  if (timeA === timeB) {
      mostrarMensagem("Os times não podem ser iguais.");
      return;
  }

  const novoJogo = { data, hora, timeA, timeB };

  if (golsAInput.trim() !== '') {
      const golsA = parseInt(golsAInput);
      if (isNaN(golsA)) {
          mostrarMensagem("Por favor, insira um valor numérico válido para os gols do Time A ou deixe em branco.");
          return;
      }
      novoJogo.golsA = golsA;
  }

  if (golsBInput.trim() !== '') {
      const golsB = parseInt(golsBInput);
      if (isNaN(golsB)) {
          mostrarMensagem("Por favor, insira um valor numérico válido para os gols do Time B ou deixe em branco.");
          return;
      }
      novoJogo.golsB = golsB;
  }

  const salvarJogoBtn = document.getElementById("salvar-jogo-button");
  const editRodadaNum = salvarJogoBtn.dataset.editRodadaNum;
  const editJogoIndex = salvarJogoBtn.dataset.editJogoIndex;

  // --- LÓGICA DE EDIÇÃO ---
  if (editRodadaNum && editJogoIndex !== undefined && editJogoIndex !== null && editJogoIndex !== "") {
      const rodadaIdOriginal = `rodada${String(parseInt(editRodadaNum)).padStart(2, '0')}`;
      const docRefOriginal = doc(db, "rodadas", rodadaIdOriginal);

      const rodadaIdDestino = `rodada${String(rodadaNumForm).padStart(2, '0')}`;
      const docRefDestino = doc(db, "rodadas", rodadaIdDestino);

      try {
          if (rodadaIdOriginal === rodadaIdDestino) {
              const snap = await getDoc(docRefOriginal);
              if (snap.exists()) {
                  let jogos = snap.data().jogos || [];
                  const index = parseInt(editJogoIndex);

                  if (index >= 0 && index < jogos.length) {
                      jogos[index] = novoJogo;
                      await setDoc(docRefOriginal, { jogos: jogos });
                      mostrarMensagem("Jogo atualizado com sucesso!");
                  } else {
                      mostrarMensagem("Erro ao encontrar o jogo para atualização.");
                  }
              } else {
                  mostrarMensagem("Erro: Rodada de origem não encontrada.");
              }
          } else {
              const snapOriginal = await getDoc(docRefOriginal);
              if (snapOriginal.exists()) {
                  let jogosOriginal = snapOriginal.data().jogos || [];
                  const indexParaRemover = parseInt(editJogoIndex);
                  if (indexParaRemover >= 0 && indexParaRemover < jogosOriginal.length) {
                      jogosOriginal.splice(indexParaRemover, 1);
                      await setDoc(docRefOriginal, { jogos: jogosOriginal });
                  }
              }

              const snapDestino = await getDoc(docRefDestino);
              let jogosDestino = [];
              if (snapDestino.exists()) {
                  jogosDestino = snapDestino.data().jogos || [];
              }
              jogosDestino.push(novoJogo);
              await setDoc(docRefDestino, { jogos: jogosDestino });
              mostrarMensagem("Jogo movido e atualizado com sucesso!");
          }

      } catch (error) {
          console.error("Erro ao atualizar/mover o jogo:", error);
          mostrarMensagem("Ocorreu um erro ao atualizar/mover o jogo. Verifique o console para mais detalhes.");
      }

  } else { // --- LÓGICA DE ADIÇÃO DE NOVO JOGO ---
      const rodadaId = `rodada${String(rodadaNumForm).padStart(2, '0')}`;
      const docRef = doc(db, "rodadas", rodadaId);

      try {
          const docSnap = await getDoc(docRef);
          let jogos = [];
          if (docSnap.exists()) {
              jogos = docSnap.data().jogos || [];
          }
          jogos.push(novoJogo);
          await setDoc(docRef, { jogos });
          mostrarMensagem("Jogo salvo com sucesso!");

      } catch (error) {
          console.error("Erro ao salvar o novo jogo:", error);
          mostrarMensagem("Ocorreu um erro ao salvar o novo jogo. Verifique o console para mais detalhes.");
      }
  }

  // Resetar o estado de edição e o texto do botão
  delete salvarJogoBtn.dataset.editRodadaNum;
  delete salvarJogoBtn.dataset.editJogoIndex;
  salvarJogoBtn.textContent = "Salvar Jogo";

  // Limpar o formulário e sugerir a próxima rodada
  document.getElementById("data").value = '';
  document.getElementById("hora").value = '';
  document.getElementById("timeA").value = '';
  document.getElementById("golsA").value = '';
  document.getElementById("timeB").value = '';
  document.getElementById("golsB").value = '';
  sugerirRodada();

  // Recarregar rodadas no popup, caso esteja aberto
  if (document.getElementById("rodadas-popup").style.display === "flex") {
      abrirPopup();
  }
}

// --- FUNÇÕES DE POPUP PERSONALIZADAS ---
function mostrarMensagem(mensagem) {
  document.getElementById('mensagem-texto').textContent = mensagem;
  document.getElementById('mensagem-popup').style.display = 'flex';
}

function fecharPopup(popupId) {
  document.getElementById(popupId).style.display = 'none';
}

window.alert = function(mensagem) {
  mostrarMensagem(mensagem);
};

async function abrirPopup() {
  if (Object.keys(nomesTimes).length === 0) await carregarTimes();

  const snap = await getDocs(collection(db, "rodadas"));
  rodadasCarregadas = [];
  snap.forEach(doc => {
    const numero = parseInt(doc.id.replace("rodada", ""));
    rodadasCarregadas.push({ numero, jogos: doc.data().jogos });
  });
  rodadasCarregadas.sort((a, b) => a.numero - b.numero);
  paginaAtual = 1;
  atualizarPopup();
  document.getElementById("rodadas-popup").style.display = "flex";
}

function atualizarPopup() {
  const container = document.getElementById("lista-rodadas");
  container.innerHTML = "";
  const totalPaginas = Math.ceil(rodadasCarregadas.length / porPagina);
  document.getElementById("total-paginas").textContent = totalPaginas;
  document.getElementById("numero-pagina").value = paginaAtual;

  const inicio = (paginaAtual - 1) * porPagina;
  const fim = inicio + porPagina;
  const rodadasPag = rodadasCarregadas.slice(inicio, fim);

  if (rodadasPag.length === 0) {
      container.innerHTML = "<p>Nenhuma rodada para exibir nesta página.</p>";
      return;
  }

  rodadasPag.forEach(r => {
    const div = document.createElement("div");
    div.className = "rodada";
    div.innerHTML = `<h2>Rodada ${String(r.numero).padStart(2, '0')}</h2>`;

    r.jogos.forEach((j, jogoIndex) => {
      const nomeA = nomesTimes[j.timeA] || j.timeA;
      const nomeB = nomesTimes[j.timeB] || j.timeB;

      const dataOriginal = new Date(j.data);
      const ano = dataOriginal.getUTCFullYear();
      const mes = dataOriginal.getUTCMonth();
      const dia = dataOriginal.getUTCDate();
      const dataParaExibir = new Date(ano, mes, dia);
      const dataFormatada = dataParaExibir.toLocaleDateString('pt-BR');

      const golsAExibir = (j.golsA !== undefined && j.golsA !== null) ? j.golsA : '-';
      const golsBExibir = (j.golsB !== undefined && j.golsB !== null) ? j.golsB : '-';


      const p = document.createElement("p");
      p.innerHTML = `
        <div class="jogo">
          <p>${nomeA} ${golsAExibir} x ${golsBExibir} ${nomeB} - ${dataFormatada} ${j.hora}</p>
          <button class="botao-editar-jogo"
                              data-rodada-num="${r.numero}"
                              data-jogo-index="${jogoIndex}"
                              data-data="${j.data}"
                              data-hora="${j.hora}"
                              data-time-a-id="${j.timeA}"
                              data-gols-a="${j.golsA === undefined || j.golsA === null ? '' : j.golsA}"
                              data-time-b-id="${j.timeB}"
                              data-gols-b="${j.golsB === undefined || j.golsB === null ? '' : j.golsB}">
                            &#9998; </button>
        </div>
      `;
      div.appendChild(p);
    });
    container.appendChild(div);
  });

  document.querySelectorAll('.botao-editar-jogo').forEach(button => {
      button.addEventListener('click', preencherFormularioParaEdicao);
  });
}

function preencherFormularioParaEdicao(event) {
    const btn = event.currentTarget;
    const rodadaNum = btn.dataset.rodadaNum;
    const jogoIndex = btn.dataset.jogoIndex;
    const data = btn.dataset.data;
    const hora = btn.dataset.hora;
    const timeA = btn.dataset.timeAId;
    const golsA = btn.dataset.golsA;
    const timeB = btn.dataset.timeBId;
    const golsB = btn.dataset.golsB;

    document.getElementById("rodada").value = rodadaNum;
    document.getElementById("data").value = data;
    document.getElementById("hora").value = hora;
    document.getElementById("timeA").value = timeA;
    document.getElementById("golsA").value = golsA;
    document.getElementById("timeB").value = timeB;
    document.getElementById("golsB").value = golsB;

    salvarJogoBtn.dataset.editRodadaNum = rodadaNum;
    salvarJogoBtn.dataset.editJogoIndex = jogoIndex;
    salvarJogoBtn.textContent = "Atualizar Jogo";

    fecharPopup('rodadas-popup');
    mostrarMensagem("Partida selecionada! Faça suas alterações e clique em 'Atualizar Jogo'.");
}

function mudarPagina(delta) {
  const totalPaginas = Math.ceil(rodadasCarregadas.length / porPagina);
  paginaAtual += delta;
  if (paginaAtual < 1) paginaAtual = 1;
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  atualizarPopup();
}

function irParaPagina() {
  const input = document.getElementById("numero-pagina");
  const totalPaginas = Math.ceil(rodadasCarregadas.length / porPagina);
  let pag = parseInt(input.value);
  if (isNaN(pag) || pag < 1) pag = 1;
  if (pag > totalPaginas) pag = totalPaginas;
  paginaAtual = pag;
  atualizarPopup();
}

document.getElementById("salvar-jogo-button").addEventListener("click", salvarJogo);
document.getElementById("botaoRodadas").addEventListener("click", abrirPopup);

const mensagemOkButton = document.getElementById("mensagem-ok-button");
if (mensagemOkButton) {
    mensagemOkButton.addEventListener("click", () => {
        fecharPopup('mensagem-popup');
    });
}

carregarTimes();
sugerirRodada();

// --- NOVAS ATRIBUIÇÕES DE EVENT LISTENERS PARA PAGINAÇÃO NO POPUP ---
document.addEventListener('DOMContentLoaded', () => { // Garante que os elementos existam
    const prevPageBtn = document.querySelector('.paginacao button:first-child');
    const nextPageBtn = document.querySelector('.paginacao button:last-child');
    const pageInput = document.getElementById('numero-pagina');

    // ADICIONANDO LISTENER PARA O BOTÃO DE FECHAR DO POPUP DE RODADAS
    const closeButtonRodadas = document.querySelector('#rodadas-popup .close-button');

    if (closeButtonRodadas) {
        closeButtonRodadas.addEventListener('click', () => {
            fecharPopup('rodadas-popup');
        });
    }
    // FIM DA ADIÇÃO

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => mudarPagina(-1));
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => mudarPagina(1));
    }
    if (pageInput) {
        pageInput.addEventListener('change', irParaPagina);
    }
});
// --- FIM DAS NOVAS ATRIBUIÇÕES ---