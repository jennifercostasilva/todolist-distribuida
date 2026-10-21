<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistroLog extends Model
{
    protected $table = 'registro_logs';

    protected $fillable = [
        'acao',
        'detalhe',
        'usuario_id',
        'tarefa_id',
        'origem',
    ];
}