<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\LogController;

Route::post('/logs', LogController::class);