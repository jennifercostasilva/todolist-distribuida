import "dotenv/config";
import prisma from "../lib/prisma.js";

const url = process.env.STATS_SERVICE_URL;
const secret = process.env.STATS_SERVICE_SECRET;

async function main() {
    if (!url || !secret) {
        throw new Error(
            "Configure STATS_SERVICE_URL e STATS_SERVICE_SECRET no .env."
        );
    }

    const todos = await prisma.todo.findMany();

    let sincronizadas = 0;
    let falhas = 0;

    console.log(`Encontradas ${todos.length} tarefas para sincronizar.`);

    for (const todo of todos) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Service-Secret": secret
                },
                body: JSON.stringify({
                    action: "CREATE",
                    todoId: todo.id,
                    userId: todo.usuarioId,
                    title: todo.titulo,
                    description: todo.descricao,
                    completed: todo.concluida
                })
            });

            if (!response.ok) {
                const detail = await response.text();

                console.error(
                    `Falha na tarefa ${todo.id}: HTTP ${response.status} ${detail}`
                );

                falhas++;
                continue;
            }

            sincronizadas++;
            console.log(`Tarefa ${todo.id} sincronizada.`);
        } catch (error) {
            falhas++;
            console.error(
                `Erro na tarefa ${todo.id}: ${error.message}`
            );
        }
    }

    console.log(`Sincronizadas: ${sincronizadas}`);
    console.log(`Falhas: ${falhas}`);
}

main()
    .catch(error => {
        console.error("Erro na sincronização:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });