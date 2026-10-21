import "dotenv/config";

export async function syncTaskStats({
    action,
    todoId,
    userId,
    title = null,
    description = null,
    completed = false
}) {
    const url = process.env.STATS_SERVICE_URL;
    const secret = process.env.STATS_SERVICE_SECRET;

    if (!url || !secret) {
        console.error(
            "[STATS] URL ou segredo do serviço de estatísticas não configurado."
        );
        return false;
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
                todoId,
                userId,
                title,
                description,
                completed
            }),
            signal: AbortSignal.timeout(3000)
        });

        if (!response.ok) {
            const detail = await response.text();

            console.error(
                `[STATS] Erro HTTP ${response.status}: ${detail}`
            );

            return false;
        }

        console.log(
            `[STATS] Tarefa ${todoId} sincronizada: ${action}`
        );

        return true;
    } catch (error) {
        console.error(
            "[STATS] Falha na sincronização:",
            error.message
        );

        return false;
    }
}