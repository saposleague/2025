// admin.js
import { app } from './firebase-config.js'; // Importa o app do arquivo de configuração
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const auth = getAuth(app);

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const erroEl = document.getElementById("erro");
const loginButton = document.getElementById("login-button");

// Limpa a mensagem de erro quando o usuário digita nos campos
emailInput.addEventListener("input", () => {
    erroEl.textContent = "";
});
senhaInput.addEventListener("input", () => {
    erroEl.textContent = "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value;
  const senha = senhaInput.value;

  erroEl.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "painel.html";
  } catch (err) {
    let errorMessage = "Ocorreu um erro desconhecido.";
    switch (err.code) {
      case "auth/invalid-email":
        errorMessage = "O endereço de e-mail é inválido.";
        break;
      case "auth/user-disabled":
        errorMessage = "Esta conta de usuário foi desativada.";
        break;
      case "auth/user-not-found":
      case "auth/wrong-password":
        errorMessage = "Email ou senha inválidos.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Muitas tentativas de login. Tente novamente mais tarde.";
        break;
      default:
        errorMessage = "Falha no login. Por favor, tente novamente.";
    }
    erroEl.textContent = errorMessage;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Entrar";
  }
});