import {
    registerUser,
    loginUser,
    getCurrentUser,
    getTodos,
    createTodo,
    toggleTodo,
    deleteTodo,
    getStats
} from "./todoService.js";

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const todoForm = document.getElementById("todoForm");

const authMessage = document.getElementById("authMessage");
const appMessage = document.getElementById("appMessage");

const userName = document.getElementById("userName");
const todoList = document.getElementById("todoList");

const totalSpan = document.getElementById("total");
const completedSpan = document.getElementById("completed");
const pendingSpan = document.getElementById("pending");

function showAuth(message = "") {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    authMessage.textContent = message;
    appMessage.textContent = "";
}

function showApp(usuario) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");

    userName.textContent = usuario.nome;
    authMessage.textContent = "";
}

function handleError(error) {
    appMessage.textContent = error.message;
}

function renderTodos(todos) {
    todoList.innerHTML = "";

    if (todos.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Nenhuma tarefa cadastrada.";
        todoList.appendChild(li);
        return;
    }

    todos.forEach(todo => {
        const li = document.createElement("li");

        if (todo.completed) {
            li.classList.add("completed");
        }

        const content = document.createElement("div");
        content.classList.add("todo-content");

        const title = document.createElement("span");
        title.classList.add("todo-title");
        title.textContent = todo.title;

        content.appendChild(title);

        if (todo.description) {
            const description = document.createElement("span");
            description.classList.add("todo-description");
            description.textContent = todo.description;
            content.appendChild(description);
        }

        const actions = document.createElement("div");
        actions.classList.add("actions");

        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.classList.add("btn-complete");
        completeButton.textContent = todo.completed ? "↩" : "✔";
        completeButton.setAttribute(
            "aria-label",
            todo.completed
                ? "Marcar como pendente"
                : "Marcar como concluída"
        );

        completeButton.addEventListener("click", async () => {
            try {
                appMessage.textContent = "";

                await toggleTodo(todo.id, !todo.completed);
                await refresh();
            } catch (error) {
                handleError(error);
            }
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.classList.add("btn-delete");
        deleteButton.textContent = "✖";
        deleteButton.setAttribute("aria-label", "Excluir tarefa");

        deleteButton.addEventListener("click", async () => {
            try {
                appMessage.textContent = "";

                await deleteTodo(todo.id);
                await refresh();
            } catch (error) {
                handleError(error);
            }
        });

        actions.append(completeButton, deleteButton);
        li.append(content, actions);
        todoList.appendChild(li);
    });
}

function renderStats(stats) {
    totalSpan.textContent = stats.totalTodos;
    completedSpan.textContent = stats.completed;
    pendingSpan.textContent = stats.pending;
}

async function refresh() {
    try {
        const todos = await getTodos();
        const stats = await getStats();

        renderTodos(todos);
        renderStats(stats);
    } catch (error) {
        handleError(error);
    }
}

// Login
loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    authMessage.textContent = "";

    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginPassword").value;

    try {
        const result = await loginUser({ email, senha });

        sessionStorage.setItem("todoToken", result.token);

        loginForm.reset();
        showApp(result.usuario);
        await refresh();
    } catch (error) {
        authMessage.textContent = error.message;
    }
});

// Cadastro
registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    authMessage.textContent = "";

    const nome = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const senha = document.getElementById("registerPassword").value;

    try {
        await registerUser({ nome, email, senha });

        // Depois do cadastro, entrar automaticamente.
        const result = await loginUser({ email, senha });

        sessionStorage.setItem("todoToken", result.token);

        registerForm.reset();
        showApp(result.usuario);
        appMessage.textContent = "Conta criada com sucesso!";
        await refresh();
    } catch (error) {
        authMessage.textContent = error.message;
    }
});

// Criar tarefa
todoForm.addEventListener("submit", async event => {
    event.preventDefault();
    appMessage.textContent = "";

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;

    try {
        await createTodo({ title, description });

        todoForm.reset();
        await refresh();
    } catch (error) {
        handleError(error);
    }
});

// Sair
document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("todoToken");
    showAuth("Você saiu da sua conta.");
});

// Restaurar a sessão enquanto o token ainda for válido.
async function initialize() {
    const token = sessionStorage.getItem("todoToken");

    if (!token) {
        showAuth();
        return;
    }

    try {
        const result = await getCurrentUser();

        showApp(result.usuario);
        await refresh();
    } catch {
        sessionStorage.removeItem("todoToken");
        showAuth("Sua sessão expirou. Entre novamente.");
    }
}

initialize();