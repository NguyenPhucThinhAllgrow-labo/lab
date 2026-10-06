<?php

namespace App\Console\Commands;

use App\Services\TowerDefenseDefaultVisualScales;
use Illuminate\Console\Command;

class UpdateTowerDefenseVisualScales extends Command
{
    protected $signature = 'tower-defense:update-default-visual-scales';
    protected $description = 'Update built-in tower level heights and enemy scales without resetting gameplay or maps';

    public function handle(TowerDefenseDefaultVisualScales $defaults): int
    {
        $counts = $defaults->apply();
        $this->info("Updated visual configuration: {$counts['towers']} towers, {$counts['enemies']} enemies.");
        return self::SUCCESS;
    }
}
