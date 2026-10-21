import "dotenv/config";

export async function createLog({
    action,
    message,
    userId = null,
    todoId = null,
    origin = "servico-tarefas"
}) {
    const url = process.env.LOG_SERVICE_URL;
    const secret = process.env.LOG_SERVICE_SECRET;

    if (!url || !secret) {
        console.error(
            "[LOGS] URL ou segredo do serviço de logs não configurado."
        );
        return;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Service-Secret": secret
            },
            body: JSON.stringify({
                action,
                message,
                userId,
                todoId,
                origin
            })
        });

        if (!response.ok) {
            const detail = await response.text();

            console.error(
                `[LOGS] Laravel respondeu HTTP ${response.status}: ${detail}`
            );
        }
    } catch (error) {
        console.error(
            "[LOGS] Não foi possível enviar o registro ao Laravel:",
            error.message
        );
    }
}