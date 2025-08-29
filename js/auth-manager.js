// auth-manager.js - Gerenciador de autenticação para admin-peladas
import { app } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

class AuthManager {
    constructor() {
        this.auth = getAuth(app);
        this.user = null;
        this.init();
    }

    init() {
        // Verificar estado de autenticação
        onAuthStateChanged(this.auth, (user) => {
            if (!user) {
                // Usuário não está logado, redirecionar para página de login
                this.redirectToLogin();
            } else {
                // Usuário está logado
                this.user = user;
                this.showUserInfo();
                this.setupLogout();
            }
        });
    }

    redirectToLogin() {
        // Salvar a URL atual para redirecionar de volta após o login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = '../admin.html';
    }

    showUserInfo() {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement && this.user) {
            userEmailElement.textContent = `👤 ${this.user.email}`;
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await signOut(this.auth);
                    // Limpar dados da sessão
                    sessionStorage.removeItem('redirectAfterLogin');
                    window.location.href = '../admin.html';
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    // Em caso de erro, tentar redirecionar mesmo assim
                    window.location.href = '../admin.html';
                }
            });
        }
    }

    // Método para verificar se o usuário está autenticado
    isAuthenticated() {
        return !!this.user;
    }

    // Método para obter informações do usuário
    getUser() {
        return this.user;
    }
}

// Inicializar o gerenciador de autenticação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Exportar para uso em outros módulos se necessário
export { AuthManager };
