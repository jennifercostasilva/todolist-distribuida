from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    func
)
from sqlalchemy.orm import mapped_column

from database import Base


class TaskSnapshot(Base):
    __tablename__ = "task_snapshots"

    id = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    todo_id = mapped_column(
        Integer,
        unique=True,
        index=True,
        nullable=False
    )

    user_id = mapped_column(
        Integer,
        index=True,
        nullable=False
    )

    title = mapped_column(
        String(255),
        nullable=False
    )

    description = mapped_column(
        Text,
        nullable=True
    )

    completed = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    updated_at = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )