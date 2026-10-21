<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RegistroLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LogController extends Controller
{
    public function __invoke(Request $request)
    {
        $expectedSecret = (string) config(
            'services.log_service.secret'
        );

        $providedSecret = (string) $request->header(
            'X-Service-Secret',
            ''
        );

        if (
            $expectedSecret === '' ||
            !hash_equals($expectedSecret, $providedSecret)
        ) {
            return response()->json([
                'erro' => 'Não autorizado.'
            ], 401);
        }

        $validated = $request->validate([
            'action' => [
                'required',
                'string',
                Rule::in([
                    'CREATE',
                    'UPDATE',
                    'DELETE',
                    'ACCESS_DENIED',
                    'ERROR',
                ]),
            ],
            'message' => ['required', 'string', 'max:5000'],
            'userId' => ['nullable', 'integer', 'min:1'],
            'todoId' => ['nullable', 'integer', 'min:1'],
            'origin' => ['nullable', 'string', 'max:100'],
        ]);

        $log = RegistroLog::create([
            'acao' => $validated['action'],
            'detalhe' => $validated['message'],
            'usuario_id' => $validated['userId'] ?? null,
            'tarefa_id' => $validated['todoId'] ?? null,
            'origem' => $validated['origin'] ?? 'servico-tarefas',
        ]);

        return response()->json([
            'mensagem' => 'Log registrado com sucesso.',
            'id' => $log->id,
        ], 201);
    }
}