import { API_CONFIG } from "./api.js";

async function request(path, options = {}) {
    const headers = { ...options.headers };

    const token = sessionStorage.getItem("todoToken");

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(
        `${API_CONFIG.TASKS}${path}`,
        {
            ...options,
            headers
        }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            result.erro ||
            result.mensagem ||
            `Erro HTTP ${response.status}`
        );
    }

    return result;
}

// AUTENTICAÇÃO

export async function registerUser(data) {
    return request("/auth/register", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function loginUser(data) {
    return request("/auth/login", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function getCurrentUser() {
    return request("/auth/me");
}

// TAREFAS

export async function getTodos() {
    const result = await request("/todos");
    return result.data;
}

export async function createTodo(data) {
    return request("/todos", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export async function toggleTodo(id, completed) {
    return request(`/todos/${id}`, {
        method: "PUT",
        body: JSON.stringify({ completed })
    });
}

export async function deleteTodo(id) {
    return request(`/todos/${id}`, {
        method: "DELETE"
    });
}

// Estatísticas temporárias calculadas a partir das tarefas.
// Depois integraremos o serviço FastAPI + SQLAlchemy.

export async function getStats() {
    const token = sessionStorage.getItem("todoToken");

    if (!token) {
        throw new Error("Faça login para consultar as estatísticas.");
    }

    const response = await fetch(`${API_CONFIG.STATS}/stats`, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            result.detail ||
            result.erro ||
            `Erro ao consultar estatísticas: HTTP ${response.status}`
        );
    }

    return {
        totalTodos: result.total,
        completed: result.concluidas,
        pending: result.pendentes
    };
}