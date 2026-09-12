<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'chinese_chess_ml' => [
        'model_path' => env(
            'CHINESE_CHESS_ML_MODEL_PATH',
            resource_path('ml/chinese-chess-model.json'),
        ),
    ],

    'chinese_chess_engine' => [
        'url' => env('CHINESE_CHESS_ENGINE_URL', 'http://pikafish:8080'),
        'move_time_ms' => env('CHINESE_CHESS_ENGINE_MOVE_TIME_MS', 700),
        'timeout_seconds' => env('CHINESE_CHESS_ENGINE_TIMEOUT_SECONDS', 5),
    ],

];
