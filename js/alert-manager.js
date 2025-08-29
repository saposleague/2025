// ===== SISTEMA DE ALERTS PERSONALIZADOS =====

class AlertManager {
    constructor() {
        this.container = null;
        this.alerts = [];
        this.init();
    }

    init() {
        // Criar container se não existir
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'alert-container';
            document.body.appendChild(this.container);
        }
    }

    // Mostrar alert de sucesso
    success(title, message = '', duration = 5000) {
        return this.show('success', title, message, duration);
    }

    // Mostrar alert de erro
    error(title, message = '', duration = 5000) {
        return this.show('error', title, message, duration);
    }

    // Mostrar alert de aviso
    warning(title, message = '', duration = 5000) {
        return this.show('warning', title, message, duration);
    }

    // Mostrar alert informativo
    info(title, message = '', duration = 5000) {
        return this.show('info', title, message, duration);
    }

    // Mostrar alert com progress bar
    progress(title, message = '', duration = 3000) {
        return this.show('info', title, message, duration, true);
    }

    // Método principal para mostrar alerts
    show(type, title, message = '', duration = 5000, withProgress = false) {
        this.init();

        const alertId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} ${withProgress ? 'alert-with-progress' : ''}`;
        alertElement.id = alertId;

        // Ícone baseado no tipo
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        // HTML do alert (sem botão de fechar X)
        alertElement.innerHTML = `
            <div class="alert-icon">${icons[type]}</div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                ${message ? `<div class="alert-message">${message}</div>` : ''}
            </div>
            ${withProgress ? '<div class="alert-progress"></div>' : ''}
        `;

        // Adicionar ao container
        this.container.appendChild(alertElement);
        this.alerts.push(alertId);

        // Auto-remover após duração (se não for 0)
        if (duration > 0) {
            setTimeout(() => {
                this.close(alertId);
            }, duration);
        }

        // Retornar ID para controle manual
        return alertId;
    }

    // Fechar alert específico
    close(alertId) {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            // Adicionar classe de saída para animação
            alertElement.classList.add('alert-exit');
            
            // Remover após animação
            setTimeout(() => {
                if (alertElement && alertElement.parentNode) {
                    alertElement.parentNode.removeChild(alertElement);
                }
                // Remover da lista
                this.alerts = this.alerts.filter(id => id !== alertId);
            }, 300);
        }
    }

    // Fechar todos os alerts
    closeAll() {
        this.alerts.forEach(alertId => {
            this.close(alertId);
        });
    }

    // Substituir alert padrão do navegador
    replaceNativeAlerts() {
        // Substituir alert() com auto-fechamento em 5s
        window.alert = (message) => {
            this.info('Aviso', message, 5000);
        };

        // Substituir confirm() (simplificado)
        window.confirm = (message) => {
            return new Promise((resolve) => {
                const alertId = this.info('Confirmação', message, 0);
                
                // Criar botões de confirmação
                const alertElement = document.getElementById(alertId);
                if (alertElement) {
                    const content = alertElement.querySelector('.alert-content');
                    const buttonsDiv = document.createElement('div');
                    buttonsDiv.style.marginTop = '12px';
                    buttonsDiv.style.display = 'flex';
                    buttonsDiv.style.gap = '8px';
                    
                    buttonsDiv.innerHTML = `
                        <button onclick="alertManager.confirmResponse('${alertId}', true)" 
                                style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                            Sim
                        </button>
                        <button onclick="alertManager.confirmResponse('${alertId}', false)" 
                                style="background: #6b7280; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                            Não
                        </button>
                    `;
                    
                    content.appendChild(buttonsDiv);
                }
                
                // Armazenar promise para resolver
                this.pendingConfirm = { alertId, resolve };
            });
        };
    }

    // Resolver confirmação
    confirmResponse(alertId, response) {
        if (this.pendingConfirm && this.pendingConfirm.alertId === alertId) {
            this.pendingConfirm.resolve(response);
            this.pendingConfirm = null;
            this.close(alertId);
        }
    }
}

// Instância global
const alertManager = new AlertManager();

// Substituir alerts nativos quando o script for carregado
document.addEventListener('DOMContentLoaded', () => {
    alertManager.replaceNativeAlerts();
});

// Funções de conveniência para uso global
window.showSuccess = (title, message, duration) => alertManager.success(title, message, duration);
window.showError = (title, message, duration) => alertManager.error(title, message, duration);
window.showWarning = (title, message, duration) => alertManager.warning(title, message, duration);
window.showInfo = (title, message, duration) => alertManager.info(title, message, duration);
window.showProgress = (title, message, duration) => alertManager.progress(title, message, duration);
