
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { createLog } from "../lib/logService.js";
import { syncTaskStats } from "../lib/statsService.js";

const router = Router();

router.use(authenticateToken);

function formatTodo(todo) {
    return {
        id: todo.id,
        title: todo.titulo,
        description: todo.descricao,
        completed: todo.concluida
    };
}

// LISTAR tarefas do usuário autenticado
router.get("/", async (req, res) => {
    try {
        const todos = await prisma.todo.findMany({
            where: {
                usuarioId: req.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.json({
            data: todos.map(formatTodo)
        });
    } catch (error) {
        console.error("Erro ao listar tarefas:", error);

        await createLog({
            action: "ERROR",
            message: "Erro ao listar tarefas.",
            userId: req.user.id
        });

        return res.status(500).json({
            erro: "Não foi possível listar as tarefas."
        });
    }
});

// CRIAR tarefa
router.post("/", async (req, res) => {
    try {
        const { title, description } = req.body;

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                erro: "O título da tarefa é obrigatório."
            });
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== "string"
        ) {
            return res.status(400).json({
                erro: "A descrição deve ser um texto."
            });
        }

        const todo = await prisma.todo.create({
            data: {
                titulo: title.trim(),
                descricao: description?.trim() || null,
                usuarioId: req.user.id
            }
        });

        await createLog({
            action: "CREATE",
            message: "Tarefa criada com sucesso.",
            userId: req.user.id,
            todoId: todo.id
        });

        await syncTaskStats({
            action: "CREATE",
            todoId: todo.id,
            userId: req.user.id,
            title: todo.titulo,
            description: todo.descricao,
            completed: todo.concluida
        });

        return res.status(201).json({
            data: formatTodo(todo)
        });
    } catch (error) {
        console.error("Erro ao criar tarefa:", error);

        await createLog({
            action: "ERROR",
            message: "Erro ao criar tarefa.",
            userId: req.user.id
        });

        return res.status(500).json({
            erro: "Não foi possível criar a tarefa."
        });
    }
});

// ALTERAR conclusão de tarefa
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const { completed } = req.body;

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID de tarefa inválido."
            });
        }

        if (typeof completed !== "boolean") {
            return res.status(400).json({
                erro: "Informe completed como true ou false."
            });
        }

        const result = await prisma.todo.updateMany({
            where: {
                id,
                usuarioId: req.user.id
            },
            data: {
                concluida: completed
            }
        });

        if (result.count === 0) {
            await createLog({
                action: "ACCESS_DENIED",
                message:
                    "Tentativa de alterar tarefa inexistente ou pertencente a outro usuário.",
                userId: req.user.id,
                todoId: id
            });

            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        const todo = await prisma.todo.findFirst({
            where: {
                id,
                usuarioId: req.user.id
            }
        });

        if (!todo) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        await createLog({
            action: "UPDATE",
            message: "Estado de conclusão da tarefa alterado.",
            userId: req.user.id,
            todoId: todo.id
        });

        await syncTaskStats({
            action: "UPDATE",
            todoId: todo.id,
            userId: req.user.id,
            title: todo.titulo,
            description: todo.descricao,
            completed: todo.concluida
        });

        return res.json({
            data: formatTodo(todo)
        });
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);

        await createLog({
            action: "ERROR",
            message: "Erro ao atualizar tarefa.",
            userId: req.user.id,
            todoId: Number.isSafeInteger(id) && id > 0 ? id : null
        });

        return res.status(500).json({
            erro: "Não foi possível atualizar a tarefa."
        });
    }
});

// EXCLUIR tarefa
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID de tarefa inválido."
            });
        }

        const result = await prisma.todo.deleteMany({
            where: {
                id,
                usuarioId: req.user.id
            }
        });

        if (result.count === 0) {
            await createLog({
                action: "ACCESS_DENIED",
                message:
                    "Tentativa de excluir tarefa inexistente ou pertencente a outro usuário.",
                userId: req.user.id,
                todoId: id
            });

            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        await createLog({
            action: "DELETE",
            message: "Tarefa removida com sucesso.",
            userId: req.user.id,
            todoId: id
        });

        await syncTaskStats({
            action: "DELETE",
            todoId: id,
            userId: req.user.id
        });

        return res.json({
            mensagem: "Tarefa removida com sucesso."
        });
    } catch (error) {
        console.error("Erro ao excluir tarefa:", error);

        await createLog({
            action: "ERROR",
            message: "Erro ao excluir tarefa.",
            userId: req.user.id,
            todoId: Number.isSafeInteger(id) && id > 0 ? id : null
        });

        return res.status(500).json({
            erro: "Não foi possível excluir a tarefa."
        });
    }
});

export default router;
