
import jwt from "jsonwebtoken";
import { createLog } from "../lib/logService.js";

export async function authenticateToken(req, res, next) {
    const authorization = req.headers.authorization;

    const token = authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : null;

    // Registrar tentativa de acesso sem token
    if (!token) {
        await createLog({
            action: "ACCESS_DENIED",
            message: "Tentativa de acessar rota protegida sem token.",
            userId: null,
            origin: "servico-tarefas"
        });

        return res.status(401).json({
            erro: "Token de autenticação não informado."
        });
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (
            typeof payload !== "object" ||
            payload === null ||
            typeof payload.userId !== "number"
        ) {
            await createLog({
                action: "ACCESS_DENIED",
                message: "Tentativa de acesso com token inválido.",
                userId: null,
                origin: "servico-tarefas"
            });

            return res.status(401).json({
                erro: "Token inválido."
            });
        }

        req.user = { id: payload.userId };

        return next();

    } catch (error) {
        await createLog({
            action: "ACCESS_DENIED",
            message: "Tentativa de acesso com token inválido ou expirado.",
            userId: null,
            origin: "servico-tarefas"
        });

        return res.status(401).json({
            erro: "Token inválido ou expirado."
        });
    }
}
