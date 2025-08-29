// js/config.js
// VERSÃO: 1.2 - Inicialização corrigida do Supabase
// Configuração do Supabase

const SUPABASE_URL = 'https://yaapgjkvkhsfsskkbmso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhYXBnamt2a2hzZnNza2tibXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTQ3MjUsImV4cCI6MjA3MDY3MDcyNX0.RiPWRX__AjuioaLVU5gkJFuOpVdBYwCN0HuD2gd0laM';

// Inicialização do cliente Supabase
let supabaseClient = null;

// Função para inicializar o cliente Supabase
function initializeSupabase() {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase inicializado com sucesso');
            return true;
        } else {
            console.error('❌ Supabase não foi carregado');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error);
        return false;
    }
}

// Função para obter o cliente Supabase (com retry)
function getSupabaseClient() {
    if (!supabaseClient) {
        initializeSupabase();
    }
    return supabaseClient;
}

// Tentar inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    if (!initializeSupabase()) {
        // Tentar novamente após um pequeno delay
        setTimeout(initializeSupabase, 100);
    }
});

// Também tentar inicializar quando a janela estiver carregada
window.addEventListener('load', function() {
    if (!supabaseClient) {
        initializeSupabase();
    }
});

// Configurações gerais
const CONFIG = {
    DAYS_TO_BE_ELIGIBLE: 30, // Dias para estar apto
    DATE_FORMAT: 'dd/mm/yyyy', // Formato de data para exibição
    
    // Nomes das tabelas
    TABLES: {
        JOGADORES: 'jogadores',
        TIMES: 'times',
        PRESENCAS: 'presencas'
    },
    
    // Campos das tabelas
    FIELDS: {
        JOGADORES: {
            ID: 'id',
            NOME: 'nome',
            TIME_ID: 'time_id',
            DATA_CADASTRO: 'data_cadastro'
        },
        TIMES: {
            ID: 'id',
            NOME: 'nome',
            LOGO_URL: 'logo_url'
        },
        PRESENCAS: {
            ID: 'id',
            JOGADOR_ID: 'jogador_id',
            DATA_PELADA: 'data_pelada',
            CREATED_AT: 'created_at',
            OBSERVACOES: 'observacoes'
        }
    }
};

// Funções utilitárias para data
const DateUtils = {
    // Converte data do formato YYYY-MM-DD para DD/MM/YYYY
    formatToBR(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    },
    
    // Converte data do formato DD/MM/YYYY para YYYY-MM-DD
    formatToISO(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    },
    
    // Obtém data atual no formato YYYY-MM-DD
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    },
    
    // Calcula se jogador está apto (dentro dos últimos 30 dias)
    isPlayerEligible(lastPresenceDate) {
        if (!lastPresenceDate) return false;
        
        const hoje = new Date();
        const dataUltimaPresenca = new Date(lastPresenceDate + 'T00:00:00');
        
        // Calcula dias desde a última pelada usando UTC para evitar problemas de fuso horário
        const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
        const dataUltimaUTC = new Date(Date.UTC(dataUltimaPresenca.getFullYear(), dataUltimaPresenca.getMonth(), dataUltimaPresenca.getDate()));
        
        const diffTime = hojeUTC - dataUltimaUTC;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= CONFIG.DAYS_TO_BE_ELIGIBLE;
    },
    
    // Calcula quantos dias se passaram desde a última presença
    daysSinceLastPresence(lastPresenceDate) {
        if (!lastPresenceDate) return null;
        
        const hoje = new Date();
        const dataUltimaPresenca = new Date(lastPresenceDate + 'T00:00:00');
        
        // Calcula dias desde a última pelada usando UTC para evitar problemas de fuso horário
        const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
        const dataUltimaUTC = new Date(Date.UTC(dataUltimaPresenca.getFullYear(), dataUltimaPresenca.getMonth(), dataUltimaPresenca.getDate()));
        
        const diffTime = hojeUTC - dataUltimaUTC;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }
};

// Exportar configurações (se usando modules)
// export { supabase, CONFIG, DateUtils };