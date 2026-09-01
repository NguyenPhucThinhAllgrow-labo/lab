<?php

namespace Database\Seeders;

use App\Models\DetectiveCase;
use Illuminate\Database\Seeder;

class DetectiveCaseSeeder extends Seeder
{
    public function run(): void
    {
        $cases = [
            [
                'id' => 'case001',
                'title' => [
                    'en' => 'THE MIDNIGHT TERMINAL',
                    'vi' => 'THIẾT BỊ ĐẦU CUỐI LÚC NỬA ĐÊM',
                ],
                'description' => [
                    'en' => 'Alex Morgan disappeared from his office at approximately 23:50. His workstation was left unlocked.',
                    'vi' => 'Alex Morgan biến mất khỏi văn phòng vào khoảng 23:50. Máy tính làm việc của anh ta vẫn được mở khóa.',
                ],
                'sort_order' => 1,
            ],
            [
                'id' => 'case002',
                'title' => [
                    'en' => 'CASE 002 — THE MIDNIGHT TRANSFER',
                    'vi' => 'VỤ ÁN 002 — VỤ CHUYỂN GIAO LÚC NỬA ĐÊM',
                ],
                'description' => [
                    'en' => 'A suspicious data transfer occurred at 00:17. Investigate the workstation and determine who accessed the confidential files.',
                    'vi' => 'Một vụ chuyển dữ liệu đáng ngờ xảy ra lúc 00:17. Hãy điều tra máy trạm và xác định ai đã truy cập các tệp bảo mật.',
                ],
                'sort_order' => 2,
            ],
            [
                'id' => 'case003',
                'title' => [
                    'en' => 'THE GHOST PROTOCOL',
                    'vi' => 'GIAO THỨC BÓNG MA',
                ],
                'description' => [
                    'en' => 'At 02:17, the company security system detected an unauthorized transfer of a classified research archive. At 02:19, the lead researcher Daniel Cross was found unconscious inside a locked server room. The access logs identify Daniel as the last person to enter. However, network records suggest that someone else was operating his account.',
                    'vi' => 'Lúc 02:17, hệ thống an ninh của công ty phát hiện một vụ chuyển giao trái phép kho nghiên cứu mật. Lúc 02:19, trưởng nhóm nghiên cứu Daniel Cross được phát hiện bất tỉnh bên trong một phòng máy chủ bị khóa. Nhật ký ra vào xác định Daniel là người cuối cùng bước vào. Tuy nhiên, các bản ghi mạng cho thấy có người khác đang sử dụng tài khoản của anh ấy.',
                ],
                'sort_order' => 3,
            ],
        ];

        foreach ($cases as $case) {
            DetectiveCase::query()->updateOrCreate(
                ['id' => $case['id']],
                [...$case, 'is_active' => true],
            );
        }
    }
}
