# Tower Defense maps

Mỗi map là một `TowerDefenseMapDefinition` độc lập. Gameplay và Three.js cùng
đọc definition này nên không cần sửa logic chiến đấu khi thay bản đồ.

Để thêm map:

1. Sao chép `kingdom-crossroads.ts` và đổi `id`, kích thước, `maxTowerCount`,
   các anchor của hai lane, `cellSize`, camera, theme, scenery và cấu hình lâu
   đài.
2. Dùng `expandOrthogonalPath()` cho từng lane và `collectPathTiles()` để tạo
   các ô cấm xây.
3. Import map mới vào `index.ts` và thêm nó vào `TOWER_DEFENSE_MAPS`.
4. Mở `/games/tower-defense?map=<id>`. Khi registry có hơn một map, bộ chọn map
   trên giao diện sẽ tự xuất hiện.
