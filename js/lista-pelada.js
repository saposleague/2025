// js/lista-pelada.js
// VERSÃO: 1.3 - Cálculo de dias corrigido com UTC + Carregamento de todas as presenças + Formatação de data corrigida

// 1. VARIÁVEIS GLOBAIS
let teamsData = [];
let playersData = [];
let presencasData = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// 2. ELEMENTOS DO DOM
const teamsContainer = document.getElementById('teams-container');
const modalPlayer = document.getElementById('modal-player');
const modalPlayerName = document.getElementById('modal-player-name');
const playerPeladasList = document.getElementById('player-peladas-list');
const closePlayerModal = document.getElementById('close-player-modal');

const modalPeladas = document.getElementById('modal-peladas');
const closePeladasModal = document.getElementById('close-peladas-modal');
const btnVerPeladas = document.getElementById('btn-ver-peladas');
const dateFilter = document.getElementById('date-filter');
const btnFilter = document.getElementById('btn-filter');
const peladasList = document.getElementById('peladas-list');

// 3. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verifica se o Supabase foi carregado
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase não foi carregado. Verifique sua conexão com a internet.');
        }
        
        console.log('🚀 Iniciando carregamento de dados...');
        
        // Aguarda o cliente Supabase estar pronto
        await waitForSupabaseClient();
        
        // Por enquanto, vamos carregar diretamente sem cache para debug
        await loadAllData();
        renderTeamsAndPlayers();
        initEventListeners();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Erro ao carregar dados: ${error.message}`);
    }
});

// Função para mostrar erros na interface
function showError(message) {
    teamsContainer.innerHTML = `
        <div class="error-message">
            <h3>❌ Erro ao carregar dados</h3>
            <p>${message}</p>
            <div class="error-details">
                <p><strong>Possíveis soluções:</strong></p>
                <ul>
                    <li>Verifique sua conexão com a internet</li>
                    <li>Recarregue a página (F5)</li>
                    <li>Verifique se o Supabase está funcionando</li>
                </ul>
            </div>
        </div>
    `;
}

// Função para aguardar o cliente Supabase estar pronto
async function waitForSupabaseClient() {
    let tentativas = 0;
    const maxTentativas = 50; // 5 segundos máximo
    
    while (!supabaseClient && tentativas < maxTentativas) {
        console.log(`⏳ Aguardando Supabase... Tentativa ${tentativas + 1}/${maxTentativas}`);
        // Tenta inicializar o Supabase
        if (typeof getSupabaseClient === 'function') {
            supabaseClient = getSupabaseClient();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
    }
    
    if (!supabaseClient) {
        throw new Error('Cliente Supabase não foi inicializado após 5 segundos');
    }
    
    console.log('✅ Supabase cliente está pronto!');
}

// Função para verificar se deve atualizar o cache
function shouldUpdateCache() {
    return Date.now() - lastCacheUpdate > CACHE_DURATION;
}

// Função para salvar dados no cache local
function saveToCache() {
    try {
        const cacheData = {
            teams: teamsData,
            players: playersData,
            presencas: presencasData,
            timestamp: Date.now()
        };
        localStorage.setItem('saposLeagueCache', JSON.stringify(cacheData));
        lastCacheUpdate = Date.now();
    } catch (error) {
        console.warn('Erro ao salvar cache:', error);
    }
}

// Função para carregar dados do cache local
function loadFromCache() {
    try {
        const cached = localStorage.getItem('saposLeagueCache');
        if (cached) {
            const cacheData = JSON.parse(cached);
            const isExpired = Date.now() - cacheData.timestamp > CACHE_DURATION;
            
            if (!isExpired) {
                teamsData = cacheData.teams || [];
                playersData = cacheData.players || [];
                presencasData = cacheData.presencas || [];
                lastCacheUpdate = cacheData.timestamp;
                return true;
            }
        }
        return false;
    } catch (error) {
        console.warn('Erro ao carregar cache:', error);
        return false;
    }
}

// Atualiza dados em background sem bloquear a interface
async function updateDataInBackground() {
    try {
        await loadAllData();
        saveToCache();
    } catch (error) {
        console.warn('Erro ao atualizar dados em background:', error);
    }
}

// 4. CARREGAMENTO DE DADOS
async function loadAllData() {
    try {
        console.log('📊 Iniciando loadAllData...');
        
        // Garante que o cliente Supabase esteja disponível
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }
        
        // Comentando temporariamente o loading otimizado para debug
        // showOptimizedLoading();
        
        console.log('🔄 Carregando times e jogadores em paralelo...');
        
        // Carrega times e jogadores em paralelo para maior velocidade
        const [teamsResult, playersResult] = await Promise.all([
            client
                .from('times')
                .select('*')
                .order('nome'),
            client
                .from('jogadores')
                .select(`
                    *,
                    times (
                        id,
                        nome,
                        logo_url
                    )
                `)
                .order('nome')
        ]);

        console.log('✅ Resultados recebidos:', { teams: teamsResult, players: playersResult });

        if (teamsResult.error) throw teamsResult.error;
        if (playersResult.error) throw playersResult.error;
        
        teamsData = teamsResult.data || [];
        playersData = playersResult.data || [];
        
        console.log('📈 Dados carregados:', { 
            teamsCount: teamsData.length, 
            playersCount: playersData.length 
        });

        // Renderiza interface imediatamente com times e jogadores
        console.log('🎨 Renderizando interface...');
        renderTeamsAndPlayers();
        
        // Carrega presenças em background (não bloqueia a interface)
        console.log('⚽ Carregando presenças em background...');
        loadPresencasInBackground();
        
        // Salva no cache
        saveToCache();
        
    } catch (error) {
        console.error('❌ Erro em loadAllData:', error);
        throw error;
    }
}

// Carrega presenças em background para não bloquear a interface
async function loadPresencasInBackground() {
    try {
        const client = getSupabaseClient();
        if (!client) {
            console.warn('⚠️ Cliente Supabase não disponível para carregar presenças');
            return;
        }

        const { data: presencas, error: presencasError } = await client
            .from('presencas')
            .select(`
                id,
                jogador_id,
                data_pelada,
                created_at,
                observacoes,
                jogadores (
                    id,
                    nome,
                    time_id
                )
            `)
            .order('data_pelada', { ascending: false });

        if (presencasError) throw presencasError;
        presencasData = presencas || [];
        
        // Atualiza a interface com as presenças carregadas
        updateInterfaceWithPresencas();
        
    } catch (error) {
        console.error('Erro ao carregar presenças:', error);
        // Continua funcionando mesmo sem presenças
    }
}

// Atualiza a interface quando as presenças são carregadas
function updateInterfaceWithPresencas() {
    // Remove loading e atualiza status dos jogadores
    const loadingElements = document.querySelectorAll('.loading-presenca');
    loadingElements.forEach(el => el.remove());
    
    // Recalcula status dos jogadores
    renderTeamsAndPlayers();
    
    // Atualiza o cache com as presenças
    saveToCache();
}

// Mostra loading otimizado
function showOptimizedLoading() {
    teamsContainer.innerHTML = `
        <div class="loading-optimized">
            <div class="loading-spinner"></div>
            <p>Carregando times e jogadores...</p>
            <div class="loading-note">Presenças serão carregadas em background</div>
        </div>
    `;
}

// 5. RENDERIZAÇÃO DA INTERFACE
function renderTeamsAndPlayers() {
    console.log('🎨 renderTeamsAndPlayers chamada com:', { 
        teamsData: teamsData.length, 
        playersData: playersData.length 
    });
    
    if (teamsData.length === 0) {
        console.log('⚠️ Nenhum time encontrado');
        teamsContainer.innerHTML = '<div class="no-data">Nenhum time encontrado</div>';
        return;
    }

    let html = '';

    teamsData.forEach((team, teamIndex) => {
        const teamPlayers = playersData.filter(player => player.time_id === team.id);
        console.log(`🏟️ Renderizando time ${teamIndex + 1}:`, { 
            teamName: team.nome, 
            playersCount: teamPlayers.length 
        });
        
        html += `
            <div class="team-card" data-team-id="${team.id}" data-team-name="${team.nome}">
                <div class="team-header">
                    ${team.logo_url ? `<img src="${team.logo_url}" alt="${team.nome}" class="team-logo">` : ''}
                    <h3 class="team-name">${team.nome}</h3>
                </div>
                <div class="players-list">
        `;

        if (teamPlayers.length === 0) {
            html += '<p class="no-players">Nenhum jogador cadastrado</p>';
        } else {
            teamPlayers.forEach((player, playerIndex) => {
                console.log(`👤 Renderizando jogador ${playerIndex + 1}:`, { 
                    playerName: player.nome, 
                    teamId: player.time_id 
                });
                
                // Se as presenças ainda não carregaram, mostra status temporário
                if (presencasData.length === 0) {
                    html += `
                        <div class="player-item loading-status" data-player-id="${player.id}" data-player-name="${player.nome}">
                            <span class="player-name">${player.nome}</span>
                            <span class="player-status loading-presenca">
                                <span class="loading-dots">Carregando status...</span>
                            </span>
                        </div>
                    `;
                } else {
                    const playerStatus = getPlayerStatus(player.id);
                    const statusClass = playerStatus.apto ? 'apto' : 'nao-apto';
                    const statusText = playerStatus.apto ? 
                        `Última pelada: ${playerStatus.diasUltimaPresenca} dias atrás` :
                        `${playerStatus.diasUltimaPresenca} dias sem jogar`;

                    html += `
                        <div class="player-item ${statusClass}" data-player-id="${player.id}" data-player-name="${player.nome}">
                            <span class="player-name">${player.nome}</span>
                            <span class="player-status">${statusText}</span>
                        </div>
                    `;
                }
            });
        }

        html += `
                </div>
            </div>
        `;
    });

    console.log('📝 HTML gerado, atualizando container...');
    teamsContainer.innerHTML = html;
    console.log('✅ Interface renderizada com sucesso!');
}

// 6. CÁLCULO DO STATUS DOS JOGADORES
function getPlayerStatus(playerId) {
    const playerPresencas = presencasData.filter(presenca => 
        presenca.jogadores && presenca.jogadores.id === playerId
    );

    if (playerPresencas.length === 0) {
        return {
            apto: false,
            diasUltimaPresenca: 'Nunca jogou',
            ultimaPresenca: null
        };
    }

    // Ordena por data mais recente
    playerPresencas.sort((a, b) => new Date(b.data_pelada + 'T00:00:00') - new Date(a.data_pelada + 'T00:00:00'));
    const ultimaPresenca = playerPresencas[0];
    
    const hoje = new Date();
    const dataUltimaPresenca = new Date(ultimaPresenca.data_pelada + 'T00:00:00');
    
    // Calcula dias desde a última pelada usando UTC para evitar problemas de fuso horário
    const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
    const dataUltimaUTC = new Date(Date.UTC(dataUltimaPresenca.getFullYear(), dataUltimaPresenca.getMonth(), dataUltimaPresenca.getDate()));
    
    const diffTime = hojeUTC - dataUltimaUTC;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Debug para verificar o cálculo
    console.log(`🔍 Cálculo de dias para ${ultimaPresenca.data_pelada}:`, {
        hoje: hoje.toISOString().split('T')[0],
        dataUltimaPresenca: ultimaPresenca.data_pelada,
        hojeUTC: hojeUTC.toISOString().split('T')[0],
        dataUltimaUTC: dataUltimaUTC.toISOString().split('T')[0],
        diffTime: diffTime,
        diffDays: diffDays,
        interpretacao: `Jogou há ${diffDays} dias atrás`
    });

    return {
        apto: diffDays <= 30,
        diasUltimaPresenca: diffDays,
        ultimaPresenca: ultimaPresenca.data_pelada
    };
}

// Função robusta para resetar rolagem
function resetModalScroll() {
    const playerPeladasContent = modalPlayer.querySelector('.player-peladas-content');
    if (playerPeladasContent) {
        console.log('🔄 Resetando rolagem...');
        
        // Adiciona classe para desabilitar scroll suave temporariamente
        playerPeladasContent.classList.add('scroll-reset');
        
        // Múltiplas tentativas para garantir que funcione
        playerPeladasContent.scrollTop = 0;
        
        // Força o reset com requestAnimationFrame
        requestAnimationFrame(() => {
            playerPeladasContent.scrollTop = 0;
            console.log('✅ Rolagem resetada para:', playerPeladasContent.scrollTop);
            
            // Remove a classe após o reset
            setTimeout(() => {
                playerPeladasContent.classList.remove('scroll-reset');
            }, 100);
        });
        
        // Verifica se realmente foi resetado
        setTimeout(() => {
            if (playerPeladasContent.scrollTop !== 0) {
                console.log('⚠️ Rolagem não foi resetada, tentando novamente...');
                playerPeladasContent.scrollTop = 0;
            }
        }, 50);
    } else {
        console.warn('⚠️ Elemento .player-peladas-content não encontrado');
    }
}

// Função para fechar o modal do jogador e resetar rolagem
function closePlayerModalFunction() {
    modalPlayer.style.display = 'none';
    // Remove classe que bloqueia interação com o fundo
    document.body.classList.remove('modal-open');
    // Reseta a rolagem para o topo
    resetModalScroll();
}

// 7. INICIALIZAÇÃO DE EVENT LISTENERS
function initEventListeners() {
    // Click nos times para seleção responsiva (mobile)
    teamsContainer.addEventListener('click', function(e) {
        const teamCard = e.target.closest('.team-card');
        if (teamCard) {
            // Se clicou no header do time (não em um jogador específico)
            if (e.target.closest('.team-header') || e.target === teamCard) {
                handleTeamSelection(teamCard);
                return;
            }
            
            // Se clicou em um jogador, abre o modal
            const playerItem = e.target.closest('.player-item');
            if (playerItem) {
                const playerId = parseInt(playerItem.dataset.playerId);
                const playerName = playerItem.dataset.playerName;
                openPlayerModal(playerId, playerName);
            }
        }
    });

    // Botão para ver lista de peladas
    btnVerPeladas.addEventListener('click', openPeladasModal);

    // Fechar modals
    closePlayerModal.addEventListener('click', closePlayerModalFunction);

    closePeladasModal.addEventListener('click', () => {
        modalPeladas.style.display = 'none';
        // Remove classe que bloqueia interação com o fundo
        document.body.classList.remove('modal-open');
    });

    // Modal não fecha ao clicar fora (removido para melhor UX)

    // Filtro de peladas por data
    btnFilter.addEventListener('click', filterPeladas);

    // Enter no campo de data
    dateFilter.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            filterPeladas();
        }
    });
}

// 8. MODAL DO JOGADOR
function openPlayerModal(playerId, playerName) {
    // Adiciona classe para bloquear interação com o fundo
    document.body.classList.add('modal-open');
    
    modalPlayerName.textContent = playerName;

    // Busca todas as presenças do jogador
    const playerPresencas = presencasData.filter(presenca => {
        if (!presenca.jogadores || presenca.jogadores.id !== playerId) return false;
        return true; // Inclui todas as presenças
    });

    if (playerPresencas.length === 0) {
        playerPeladasList.innerHTML = '<p class="no-data">Nenhuma pelada registrada</p>';
    } else {
        // Ordena por data mais recente
        playerPresencas.sort((a, b) => new Date(b.data_pelada + 'T00:00:00') - new Date(a.data_pelada + 'T00:00:00'));
        
        // Calcula estatísticas
        const totalPeladas = playerPresencas.length;
        const hoje = new Date();
        const trintaDiasAtras = new Date(hoje.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sessentaDiasAtras = new Date(hoje.getTime() - (60 * 24 * 60 * 60 * 1000));
        const noventaDiasAtras = new Date(hoje.getTime() - (90 * 24 * 60 * 60 * 1000));
        const peladasUltimos30Dias = playerPresencas.filter(presenca => 
            new Date(presenca.data_pelada + 'T00:00:00') >= trintaDiasAtras
        ).length;
        const peladasUltimos60Dias = playerPresencas.filter(presenca => 
            new Date(presenca.data_pelada + 'T00:00:00') >= sessentaDiasAtras
        ).length;
        const peladasUltimos90Dias = playerPresencas.filter(presenca => 
            new Date(presenca.data_pelada + 'T00:00:00') >= noventaDiasAtras
        ).length;
        
        // Adiciona estatísticas no topo
        let html = `
            <div class="player-stats">
                <div class="stats-total">
                    <div class="stat-item">
                        <div class="stat-number">${totalPeladas}</div>
                        <div class="stat-label">Total de Peladas</div>
                    </div>
                </div>
                <div class="stats-periods">
                    <div class="stat-item">
                        <div class="stat-number">${peladasUltimos30Dias}</div>
                        <div class="stat-label">ÚLTIMOS<br>30 DIAS</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${peladasUltimos60Dias}</div>
                        <div class="stat-label">ÚLTIMOS<br>60 DIAS</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${peladasUltimos90Dias}</div>
                        <div class="stat-label">ÚLTIMOS<br>90 DIAS</div>
                    </div>
                </div>
            </div>
            <div class="peladas-section">
                <h5>Histórico de Participação</h5>
                <ul class="peladas-list">
        `;
        
        playerPresencas.forEach((presenca, index) => {
            const dataFormatada = formatDate(presenca.data_pelada);
            const dataObj = new Date(presenca.data_pelada + 'T00:00:00');
            const diasAtras = Math.floor((hoje - dataObj) / (1000 * 60 * 60 * 24));
            
            let tempoAtras = '';
            if (diasAtras <= 30) {
                tempoAtras = `<span class="tempo-badge recente">${diasAtras} dias atrás</span>`;
            } else {
                tempoAtras = `<span class="tempo-badge antigo">${diasAtras} dias atrás</span>`;
            }
            
            html += `
                <li class="pelada-item">
                    <div class="pelada-info">
                        <div class="pelada-date">${dataFormatada}</div>
                        <div class="pelada-tempo">${tempoAtras}</div>
                    </div>
                </li>
            `;
        });
        
        html += '</ul></div>';
        playerPeladasList.innerHTML = html;
    }

    // Mostra o modal
    modalPlayer.style.display = 'block';
    
    // Reseta a rolagem após o conteúdo ser renderizado
    setTimeout(() => {
        resetModalScroll();
    }, 10); // Pequeno delay para garantir que o DOM foi atualizado
}

// 9. MODAL DE PELADAS
function openPeladasModal() {
    console.log('🚀 Abrindo modal de peladas...');
    
    try {
        // Define data padrão como hoje
        const hoje = new Date();
        const hojeFormatado = hoje.toISOString().split('T')[0];
        console.log('📅 Data definida:', hojeFormatado);
        
        if (dateFilter) {
            dateFilter.value = hojeFormatado;
            console.log('✅ Campo de data atualizado');
        } else {
            console.error('❌ Campo dateFilter não encontrado');
        }
        
        if (modalPeladas) {
            // Adiciona classe para bloquear interação com o fundo
            document.body.classList.add('modal-open');
            modalPeladas.style.display = 'block';
            console.log('✅ Modal de peladas exibido');
            
            // Chama o filtro automaticamente para mostrar dados
            setTimeout(() => {
                console.log('🔄 Chamando filtro automático...');
                filterPeladas();
            }, 100);
        } else {
            console.error('❌ Modal modalPeladas não encontrado');
        }
        
    } catch (error) {
        console.error('❌ Erro ao abrir modal de peladas:', error);
    }
}

// 10. FILTRO DE PELADAS POR DATA
async function filterPeladas() {
    console.log('🔍 Iniciando filtro de peladas...');
    
    const selectedDate = dateFilter.value;
    console.log('📅 Data selecionada:', selectedDate);
    
    if (!selectedDate) {
        console.log('⚠️ Nenhuma data selecionada');
        peladasList.innerHTML = '<p class="no-data">Selecione uma data para ver os jogadores da pelada</p>';
        return;
    }

    try {
        // Garante que o cliente Supabase esteja disponível
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Cliente Supabase não está disponível');
        }

        console.log('🔄 Buscando presenças para a data:', selectedDate);
        
        // Busca presenças da data selecionada
        const { data: presencas, error } = await client
            .from('presencas')
            .select(`
                id,
                jogador_id,
                data_pelada,
                created_at,
                observacoes,
                jogadores (
                    id,
                    nome,
                    time_id
                )
            `)
            .eq('data_pelada', selectedDate);

        if (error) {
            console.error('❌ Erro na consulta Supabase:', error);
            throw error;
        }

        console.log('📊 Presenças encontradas:', presencas ? presencas.length : 0);

        if (!presencas || presencas.length === 0) {
            console.log('⚠️ Nenhuma presença encontrada para esta data');
            peladasList.innerHTML = '<p class="no-data">Nenhum jogador participou da pelada nesta data</p>';
            return;
        }

        console.log('🏟️ Processando presenças...');
        
        // Debug: verifica a estrutura das presenças
        console.log('🔍 Estrutura da primeira presença:', presencas[0]);
        console.log('📋 Campos disponíveis:', Object.keys(presencas[0] || {}));
        
        // Ordena as presenças por nome do time após buscar os dados
        presencas.sort((a, b) => {
            const timeA = a.jogadores?.times?.nome || '';
            const timeB = b.jogadores?.times?.nome || '';
            return timeA.localeCompare(timeB);
        });
        
        // Agrupa jogadores por time
        const jogadoresPorTime = {};
        presencas.forEach((presenca, index) => {
            console.log(`👤 Presença ${index + 1}:`, {
                jogador: presenca.jogadores?.nome,
                time: presenca.jogadores?.times?.nome
            });
            
            if (presenca.jogadores && presenca.jogadores.times) {
                const timeNome = presenca.jogadores.times.nome;
                const timeLogo = presenca.jogadores.times.logo_url;
                
                if (!jogadoresPorTime[timeNome]) {
                    jogadoresPorTime[timeNome] = {
                        logo: timeLogo,
                        jogadores: []
                    };
                }
                
                // Se a presença existe, o jogador estava presente
                jogadoresPorTime[timeNome].jogadores.push({
                    nome: presenca.jogadores.nome,
                    presente: true // Sempre true, pois se existe presença, o jogador estava presente
                });
            }
        });

        console.log('👥 Jogadores agrupados por time:', Object.keys(jogadoresPorTime));
        
        // Conta jogadores - todos que têm presença estão presentes
        const totalJogadores = presencas.length;
        const totalPresentes = presencas.length; // Todos estão presentes
        
        console.log('📊 Contagem detalhada:', {
            totalPresencas: totalJogadores,
            totalPresentes: totalPresentes
        });

        // Renderiza resultado
        let html = `<div class="pelada-info">
            <h4>Pelada do dia ${formatDate(selectedDate)}</h4>
        </div>`;

        // Lista simples e numerada de todos os jogadores
        html += `<div class="jogadores-lista">`;
        
        presencas.forEach((presenca, index) => {
            if (presenca.jogadores) {
                html += `
                    <div class="jogador-item">
                        <span class="jogador-numero">${index + 1}</span>
                        <span class="jogador-nome">${presenca.jogadores.nome}</span>
                    </div>
                `;
            }
        });
        
        html += `</div>`;

        console.log('📝 HTML gerado, atualizando lista...');
        peladasList.innerHTML = html;
        console.log('✅ Lista de peladas atualizada com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao filtrar peladas:', error);
        peladasList.innerHTML = '<p class="error">Erro ao carregar dados da pelada</p>';
    }
}

// 11. UTILITÁRIOS DE DATA
function formatDate(dateString) {
    if (!dateString) return '';
    
    // Cria a data usando UTC para evitar problemas de fuso horário
    const date = new Date(dateString + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// 12. TRATAMENTO DE ERROS
function showError(message) {
    teamsContainer.innerHTML = `
        <div class="error-message">
            <h3>Erro de Conexão</h3>
            <p>${message}</p>
            <div class="error-details">
                <p><strong>Possíveis causas:</strong></p>
                <ul>
                    <li>Problema de conexão com a internet</li>
                    <li>Servidor Supabase temporariamente indisponível</li>
                    <li>Chaves de API incorretas ou expiradas</li>
                </ul>
                <button class="btn-primary" onclick="location.reload()">Tentar Novamente</button>
            </div>
        </div>
    `;
}

// 13. FUNÇÃO UTILITÁRIA PARA DEBUG
function logDebugInfo() {
    console.log('Teams Data:', teamsData);
    console.log('Players Data:', playersData);
    console.log('Presencas Data:', presencasData);
}

// 14. FUNÇÃO PARA SELEÇÃO RESPONSIVA DOS TIMES (MOBILE)
function handleTeamSelection(selectedTeamCard) {
    console.log('🎯 handleTeamSelection chamada para:', selectedTeamCard.dataset.teamName);
    console.log('📱 Largura da janela:', window.innerWidth);
    
    // Verifica se estamos em mobile (largura <= 768px)
    if (window.innerWidth > 768) {
        console.log('🖥️ Desktop detectado, função não executa');
        return; // Não faz nada em desktop
    }
    
    console.log('📱 Mobile detectado, executando seleção');
    
    const allTeamCards = document.querySelectorAll('.team-card');
    const isCurrentlySelected = selectedTeamCard.classList.contains('selected');
    
    console.log('🏟️ Time já selecionado?', isCurrentlySelected);
    
    // Remove seleção de todos os outros times
    allTeamCards.forEach(card => {
        if (card !== selectedTeamCard) {
            card.classList.remove('selected');
            console.log('❌ Removendo seleção de:', card.dataset.teamName);
        }
    });
    
    // Se o time clicado não estava selecionado, seleciona ele
    if (!isCurrentlySelected) {
        selectedTeamCard.classList.add('selected');
        console.log('✅ Adicionando classe "selected" ao time:', selectedTeamCard.dataset.teamName);
        
        // Mostra a lista de jogadores inline (dentro do próprio card)
        showTeamPlayersInline(selectedTeamCard);
        
        console.log(`🏟️ Time selecionado: ${selectedTeamCard.dataset.teamName}`);
    } else {
        // Se clicou no time já selecionado, desseleciona
        console.log('🔄 Removendo seleção do time:', selectedTeamCard.dataset.teamName);
        
        // Esconde a lista de jogadores primeiro
        const playersList = selectedTeamCard.querySelector('.players-list');
        if (playersList) {
            playersList.style.display = 'none';
            playersList.style.visibility = 'hidden';
            playersList.style.height = '0';
            playersList.style.opacity = '0';
            console.log('👻 Lista de jogadores ocultada');
        }
        
        // Remove a classe selected imediatamente
        selectedTeamCard.classList.remove('selected');
        console.log('🔄 Classe "selected" removida imediatamente');
    }
}

// 15. FUNÇÃO PARA MOSTRAR JOGADORES INLINE (DENTRO DO CARD)
function showTeamPlayersInline(selectedTeamCard) {
    console.log('🔍 showTeamPlayersInline chamada para:', selectedTeamCard.dataset.teamName);
    
    const teamId = parseInt(selectedTeamCard.dataset.teamId);
    const teamName = selectedTeamCard.dataset.teamName;
    
    // Busca os jogadores do time
    const teamPlayers = playersData.filter(player => player.time_id === teamId);
    console.log('👥 Jogadores encontrados:', teamPlayers.length);
    
    // Cria o HTML da lista de jogadores
    let html = '';
    
    if (teamPlayers.length === 0) {
        html = '<p class="no-players">Nenhum jogador cadastrado</p>';
    } else {
        teamPlayers.forEach((player, playerIndex) => {
            // Se as presenças ainda não carregaram, mostra status temporário
            if (presencasData.length === 0) {
                html += `
                    <div class="player-item loading-status" data-player-id="${player.id}" data-player-name="${player.nome}">
                        <span class="player-name">${player.nome}</span>
                        <span class="player-status loading-presenca">
                            <span class="loading-dots">Carregando status...</span>
                        </span>
                    </div>
                `;
            } else {
                const playerStatus = getPlayerStatus(player.id);
                const statusClass = playerStatus.apto ? 'apto' : 'nao-apto';
                const statusText = playerStatus.apto ? 
                    `Última pelada: ${playerStatus.diasUltimaPresenca} dias atrás` :
                    `${playerStatus.diasUltimaPresenca} dias sem jogar`;

                html += `
                    <div class="player-item ${statusClass}" data-player-id="${player.id}" data-player-name="${player.nome}">
                        <span class="player-name">${player.nome}</span>
                        <span class="player-status">${statusText}</span>
                    </div>
                `;
            }
        });
    }
    
    console.log('📝 HTML gerado:', html);
    
    // Atualiza a lista inline do card
    const playersList = selectedTeamCard.querySelector('.players-list');
    console.log('🔍 Elemento .players-list encontrado:', playersList);
    
    if (playersList) {
        playersList.innerHTML = html;
        console.log('✅ Lista de jogadores atualizada com sucesso');
        
        // Força a exibição da lista
        playersList.style.display = 'block';
        playersList.style.visibility = 'visible';
        playersList.style.height = 'auto';
        playersList.style.opacity = '1';
        
        console.log('🎯 CSS forçado para exibir a lista');
    } else {
        console.error('❌ Elemento .players-list não encontrado no card');
    }
}

// 16. FUNÇÃO PARA ADICIONAR EVENT LISTENERS AOS JOGADORES
function addPlayerEventListeners() {
    const playerItems = document.querySelectorAll('#team-players-list .player-item');
    
    playerItems.forEach(playerItem => {
        playerItem.addEventListener('click', function() {
            const playerId = parseInt(this.dataset.playerId);
            const playerName = this.dataset.playerName;
            openPlayerModal(playerId, playerName);
        });
    });
}

// 17. EVENT LISTENER PARA REDIMENSIONAMENTO DA JANELA
window.addEventListener('resize', function() {
    // Se voltou para desktop, remove todas as seleções
    if (window.innerWidth > 768) {
        const teamsGrid = document.querySelector('.teams-grid');
        const allTeamCards = document.querySelectorAll('.team-card');
        const teamPlayersList = document.getElementById('team-players-list');
        
        allTeamCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        teamsGrid.classList.remove('has-selected');
        teamPlayersList.classList.remove('show');
    }
});