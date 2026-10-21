<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('registro_logs', function (Blueprint $table) {
            $table->id();
            $table->string('acao', 50);
            $table->text('detalhe')->nullable();
            $table->unsignedBigInteger('usuario_id')->nullable();
            $table->unsignedBigInteger('tarefa_id')->nullable();
            $table->string('origem', 100)->nullable();
            $table->timestamps();
        });
    }
};
