import os
import hmac
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware

import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import TaskSnapshot

load_dotenv()

app = FastAPI(
    title="Serviço de Estatísticas",
    description="Análise de tarefas por usuário",
    version="1.0.0"
)

# Configuração para desenvolvimento local.
# Em produção, restrinja às origens autorizadas.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Criar as tabelas do serviço, caso ainda não existam.
Base.metadata.create_all(bind=engine)


class TaskSync(BaseModel):
    action: Literal["CREATE", "UPDATE", "DELETE"]
    todoId: int = Field(gt=0)
    userId: int = Field(gt=0)
    title: str | None = None
    description: str | None = None
    completed: bool = False


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "servico": "Analisador de Tarefas"
    }


@app.post("/api/internal/tasks/sync")
def sync_task(
    payload: TaskSync,
    service_secret: str | None = Header(
        default=None,
        alias="X-Service-Secret"
    ),
    db: Session = Depends(get_db)
):
    # Validar se a requisição veio de um serviço autorizado.
    expected_secret = os.getenv("STATS_SERVICE_SECRET", "")

    if (
        not expected_secret
        or not service_secret
        or not hmac.compare_digest(expected_secret, service_secret)
    ):
        raise HTTPException(
            status_code=401,
            detail="Serviço não autorizado."
        )

    try:
        existing = (
            db.query(TaskSnapshot)
            .filter(TaskSnapshot.todo_id == payload.todoId)
            .first()
        )

        # Remover uma tarefa do conjunto de estatísticas.
        if payload.action == "DELETE":
            if existing and existing.user_id == payload.userId:
                db.delete(existing)
                db.commit()

            return {
                "mensagem": "Sincronização realizada.",
                "acao": "DELETE"
            }

        # O título é necessário para criar ou atualizar uma tarefa.
        if not payload.title or not payload.title.strip():
            raise HTTPException(
                status_code=422,
                detail="O título da tarefa é obrigatório."
            )

        # Impedir que um ID existente seja associado a outro usuário.
        if existing and existing.user_id != payload.userId:
            raise HTTPException(
                status_code=409,
                detail="A tarefa já está associada a outro usuário."
            )

        if existing is None:
            existing = TaskSnapshot(
                todo_id=payload.todoId,
                user_id=payload.userId,
                title=payload.title.strip(),
                description=payload.description,
                completed=payload.completed
            )
            db.add(existing)
        else:
            existing.title = payload.title.strip()
            existing.description = payload.description
            existing.completed = payload.completed

        db.commit()

        return {
            "mensagem": "Tarefa sincronizada com sucesso.",
            "acao": payload.action,
            "todoId": payload.todoId
        }

    except HTTPException:
        raise
    except Exception as error:
        db.rollback()
        print(f"Erro ao sincronizar tarefa: {error}")

        raise HTTPException(
            status_code=500,
            detail="Não foi possível sincronizar a tarefa."
        )


@app.get("/api/stats")
def get_stats(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    # Exigir token JWT para consultar as estatísticas.
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token de autenticação não informado."
        )

    token = authorization[7:]
    jwt_secret = os.getenv("JWT_SECRET", "")

    if not jwt_secret:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET não está configurado."
        )

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"]
        )

        user_id = payload.get("userId")

        if type(user_id) is not int or user_id <= 0:
            raise HTTPException(
                status_code=401,
                detail="Token inválido."
            )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido ou expirado."
        )

    # Calcular as estatísticas somente para o usuário autenticado.
    query = db.query(TaskSnapshot).filter(
        TaskSnapshot.user_id == user_id
    )

    total = query.count()

    completed = query.filter(
        TaskSnapshot.completed.is_(True)
    ).count()

    pending = total - completed

    return {
        "usuarioId": user_id,
        "total": total,
        "concluidas": completed,
        "pendentes": pending
    }