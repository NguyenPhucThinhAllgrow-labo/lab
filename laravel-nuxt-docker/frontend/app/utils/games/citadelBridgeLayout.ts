import { TOWER_PAD_FOOTPRINT_SCALE } from "~/utils/games/towerPadSize";

// Shared by the editor and the 3D floor so imported paving keeps the same palette.
export const CITADEL_PAVING_COLORS = ["#54525e", "#605c69", "#494852", "#57545f"] as const;

interface Point { x: number; y: number }
interface Configuration {
  cellSize: number;
  rows: number;
  sceneSettings?: {
    bridge?: { castleEdgeX: number; length: number; width?: number; paverColumns: number; paverRows: number };
    lava?: { width: number; depth: number };
  };
}

export function citadelBridgeLayout(configuration: Configuration) {
  const bridge = configuration.sceneSettings?.bridge;
  const lava = configuration.sceneSettings?.lava;
  if (!bridge || !lava) return null;
  const width = Math.max(bridge.width ?? 6.5, 3);
  const startX = bridge.castleEdgeX - bridge.length;
  const length = bridge.length / bridge.paverColumns;
  const depth = (width - 0.18) / bridge.paverRows;
  const gridStartX = Math.round((startX + lava.width / 2) / configuration.cellSize);
  const centerRow = Math.floor(configuration.rows / 2);
  return { bridge, lava, width, startX, length, depth, gridStartX, centerRow };
}

export function citadelBridgePointWorld(point: Point, configuration: Configuration) {
  const layout = citadelBridgeLayout(configuration);
  if (!layout) return null;
  const { bridge, lava, width, startX, length, depth, gridStartX, centerRow } = layout;
  const column = point.x - gridStartX;
  const row = point.y - centerRow + (bridge.paverRows - 1) / 2;
  const onDeck = column >= 0 && column < bridge.paverColumns && row >= 0 && row < bridge.paverRows;
  const balcony = column >= 0 && column <= bridge.paverColumns && Math.abs(point.y - centerRow) === 3;
  const courtTile = !onDeck && !balcony
    ? citadelForecourtTiles(configuration).find((tile) => tile.point.x === point.x && tile.point.y === point.y)
    : undefined;
  return {
    x: courtTile ? courtTile.worldX : (onDeck || balcony) && column < bridge.paverColumns
      ? startX + (column + 0.5) * length
      : point.x * configuration.cellSize - lava.width / 2,
    z: courtTile ? courtTile.worldZ : onDeck ? (point.y - centerRow) * depth
      : balcony ? Math.sign(point.y - centerRow) * (width / 2 + 0.5)
      : point.y * configuration.cellSize - lava.depth / 2,
    onDeck, balcony,
  };
}

// An odd number of columns places one slab on the gate's center axis (Z=0).
export function citadelForecourtTiles(configuration: Configuration) {
  const layout = citadelBridgeLayout(configuration);
  if (!layout) return [];
  const columns = 11;
  const rows = 5;
  const columnWidth = 24 / columns;
  const rowDepth = 10 / rows;
  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const worldX = 54.5 - (12.5 + (row + 0.5) * rowDepth);
      const worldZ = (column - (columns - 1) / 2) * columnWidth;
      tiles.push({
        point: {
          x: Math.round((worldX + layout.lava.width / 2) / configuration.cellSize),
          y: Math.round((worldZ + layout.lava.depth / 2) / configuration.cellSize),
        },
        worldX, worldZ,
        x: (worldX - rowDepth / 2 + layout.lava.width / 2) / configuration.cellSize,
        y: (worldZ - columnWidth / 2 + layout.lava.depth / 2) / configuration.cellSize,
        width: rowDepth / configuration.cellSize,
        height: columnWidth / configuration.cellSize,
        color: CITADEL_PAVING_COLORS[(column + row * 2) % CITADEL_PAVING_COLORS.length]!,
        dark: (row + column) % 2 === 0,
      });
    }
  }
  return tiles;
}

// Pick physical deck/balcony regions before considering the general map grid.
// The thin unpaved border belongs to the adjacent paving row, too.
export function pickCitadelBridgePoint(x: number, y: number, configuration: Configuration, includeBalconies = false) {
  const layout = citadelBridgeLayout(configuration);
  if (!layout) return null;
  const { bridge, lava, width, startX, length, depth, gridStartX, centerRow } = layout;
  const worldX = x * configuration.cellSize - lava.width / 2;
  const worldZ = y * configuration.cellSize - lava.depth / 2;
  if (worldX < startX || worldX >= bridge.castleEdgeX) return null;
  const column = Math.min(bridge.paverColumns - 1, Math.floor((worldX - startX) / length));
  if (Math.abs(worldZ) <= width / 2 + 1e-9) {
    const row = Math.max(0, Math.min(bridge.paverRows - 1,
      Math.floor(worldZ / depth + bridge.paverRows / 2)));
    return { x: gridStartX + column, y: centerRow + row - (bridge.paverRows - 1) / 2 };
  }
  if (includeBalconies && Math.abs(worldZ) <= width / 2 + 0.5 + 1.4 * TOWER_PAD_FOOTPRINT_SCALE)
    return { x: gridStartX + column, y: centerRow + Math.sign(worldZ) * 3 };
  return null;
}

export function citadelBridgeTiles(configuration: Configuration) {
  const layout = citadelBridgeLayout(configuration);
  if (!layout) return [];
  const { bridge, lava, startX, length, depth, gridStartX, centerRow } = layout;
  const tiles = [];
  for (let column = 0; column < bridge.paverColumns; column++) {
    for (let row = 0; row < bridge.paverRows; row++) {
      const z = (row - (bridge.paverRows - 1) / 2) * depth;
      tiles.push({
        point: { x: gridStartX + column, y: centerRow + row - (bridge.paverRows - 1) / 2 },
        x: (startX + column * length + lava.width / 2) / configuration.cellSize,
        y: (z - depth / 2 + lava.depth / 2) / configuration.cellSize,
        width: length / configuration.cellSize,
        height: depth / configuration.cellSize,
        color: CITADEL_PAVING_COLORS[(column + row * 2) % CITADEL_PAVING_COLORS.length]!,
      });
    }
  }
  return tiles;
}
