import { auth } from './config.js';
import * as AuthModule from './auth.js';
import * as DBModule from './database.js';
import * as APIModule from './api.js';
import * as UIModule from './ui.js';

// --- ESTADO GLOBAL ---
let currentUser = null;

// --- EXPOSIÇÃO DE FUNÇÕES AO WINDOW ---
// Como estamos usando type="module", precisamos expor as funções para o HTML
window.loginWithGoogle = AuthModule.loginWithGoogle;
window.logout = AuthModule.logout;
window.navigateTo = navigateToScreen; // Função local que gerencia componentes

window.loginWithEmail = () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    AuthModule.loginWithEmail(email, password);
};

window.registerWithEmail = () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    AuthModule.registerWithEmail(email, password);
};

// --- GERENCIADOR DE TELAS (COMPONENTES) ---
async function navigateToScreen(screenName) {
    // 1. Carrega o arquivo .html do componente
    await UIModule.loadComponent(screenName);

    // 2. Após carregar o HTML, inicializa os dados específicos daquela tela
    if (screenName === 'dashboard') {
        updateDashboardData();
    } else if (screenName === 'history') {
        // DBModule.loadHistoryData();
    } else if (screenName === 'goals') {
        // UIModule.loadSettingsInputs();
    }
}

// --- MONITOR DE AUTENTICAÇÃO ---
auth.onAuthStateChanged(async (user) => {
    const appView = document.getElementById('app-view');

    if (user) {
        currentUser = user;
        console.log("👤 Usuário logado:", user.email);

        // Carrega a tela principal (Dashboard)
        await navigateToScreen('dashboard');

        // Inicia a escuta de dados em tempo real na nuvem
        DBModule.listenToMeals(user.uid, (meals) => {
            console.log("🥗 Refeições atualizadas via Firebase");
            // Aqui chamaremos a função de UI para atualizar o gráfico e lista
        });

    } else {
        currentUser = null;
        console.log("🚪 Usuário deslogado");

        // Carrega a tela de Login
        await UIModule.loadComponent('login');
    }
});

// --- FUNÇÃO AUXILIAR DE DADOS ---
function updateDashboardData() {
    // Exemplo de como preencher o componente após a injeção
    if (currentUser) {
        console.log("📊 Populando dashboard para:", currentUser.displayName);
        // Chamar DBModule e UIModule para preencher os spans de calorias
    }
}