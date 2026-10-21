
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import todoRoutes from "./routes/todoRoutes.js";
import prisma from "./lib/prisma.js";
import { createLog } from "./lib/logService.js";
import { authenticateToken } from "./middleware/authMiddleware.js";

if (!process.env.JWT_SECRET) {
    throw new Error("Configure JWT_SECRET no arquivo .env");
}

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/todos", todoRoutes);

// Verificar a API e a conexão com o banco
app.get("/api/health", async (req, res) => {
    try {
        await prisma.user.count();

        return res.json({
            status: "ok",
            servico: "API de Tarefas",
            banco: "conectado"
        });
    } catch (error) {
        console.error("Erro ao consultar o banco:", error);

        await createLog({
            action: "ERROR",
            message: "Erro ao verificar a API ou consultar o banco.",
            userId: null,
            origin: "servico-tarefas"
        });

        return res.status(500).json({
            erro: "Falha ao consultar o banco de dados."
        });
    }
});

// Cadastro de usuário
app.post("/api/auth/register", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (
            typeof nome !== "string" ||
            !nome.trim() ||
            typeof email !== "string" ||
            !email.includes("@") ||
            typeof senha !== "string" ||
            senha.length < 8
        ) {
            return res.status(400).json({
                erro: "Informe nome, email válido e senha com pelo menos 8 caracteres."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const existente = await prisma.user.findUnique({
            where: { email: emailNormalizado }
        });

        if (existente) {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        const usuario = await prisma.user.create({
            data: {
                nome: nome.trim(),
                email: emailNormalizado,
                senha: senhaHash
            },
            select: {
                id: true,
                nome: true,
                email: true
            }
        });

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso.",
            usuario
        });
    } catch (error) {
        console.error("Erro no cadastro:", error);

        // E-mail duplicado é um conflito esperado, não erro interno.
        if (error.code === "P2002") {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        await createLog({
            action: "ERROR",
            message: "Erro interno durante o cadastro de usuário.",
            userId: null,
            origin: "servico-tarefas"
        });

        return res.status(500).json({
            erro: "Não foi possível cadastrar o usuário."
        });
    }
});

// Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (
            typeof email !== "string" ||
            typeof senha !== "string"
        ) {
            return res.status(400).json({
                erro: "Informe email e senha."
            });
        }

        const usuario = await prisma.user.findUnique({
            where: {
                email: email.trim().toLowerCase()
            }
        });

        if (
            !usuario ||
            !(await bcrypt.compare(senha, usuario.senha))
        ) {
            await createLog({
                action: "ACCESS_DENIED",
                message: "Tentativa de login com credenciais inválidas.",
                userId: usuario?.id ?? null,
                origin: "servico-tarefas"
            });

            return res.status(401).json({
                erro: "Email ou senha inválidos."
            });
        }

        const token = jwt.sign(
            { userId: usuario.id },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        return res.json({
            mensagem: "Login realizado com sucesso.",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (error) {
        console.error("Erro no login:", error);

        await createLog({
            action: "ERROR",
            message: "Erro interno durante o login.",
            userId: null,
            origin: "servico-tarefas"
        });

        return res.status(500).json({
            erro: "Não foi possível realizar o login."
        });
    }
});

// Consultar o usuário autenticado
app.get(
    "/api/auth/me",
    authenticateToken,
    async (req, res) => {
        try {
            const usuario = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    nome: true,
                    email: true
                }
            });

            if (!usuario) {
                return res.status(404).json({
                    erro: "Usuário não encontrado."
                });
            }

            return res.json({ usuario });
        } catch (error) {
            console.error("Erro ao consultar usuário:", error);

            await createLog({
                action: "ERROR",
                message: "Erro ao consultar o usuário autenticado.",
                userId: req.user.id,
                origin: "servico-tarefas"
            });

            return res.status(500).json({
                erro: "Não foi possível consultar o usuário."
            });
        }
    }
);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(
        `API de Tarefas rodando em http://localhost:${PORT}`
    );
});

async function shutdown() {
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
