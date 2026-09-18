import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";
import { collectPathTiles, expandOrthogonalPath } from "./map-utils";

const paths: TowerDefenseMapDefinition["paths"] = [
  expandOrthogonalPath([{ x: 0, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 10, y: 6 }, { x: 10, y: 3 }, { x: 17, y: 3 }]),
  expandOrthogonalPath([{ x: 0, y: 11 }, { x: 6, y: 11 }, { x: 6, y: 8 }, { x: 13, y: 8 }, { x: 13, y: 3 }, { x: 17, y: 3 }]),
];

export const kingdomCrossroadsMap: TowerDefenseMapDefinition = {
  id: "kingdom-crossroads",
  name: "Ngã tư Vương quốc",
  columns: 18,
  rows: 14,
  paths,
  pathTiles: collectPathTiles(paths),
  cornerRadius: 0.32,
  castle: {
    modelUrl: "/models/games/tower-defense/castle.glb",
    offsetX: 1.5,
    offsetY: -0.22,
    rotationY: 0,
    maxSize: 8.5,
    pathEndOffset: 0.48,
  },
  camera: {
    position: [5.7, 12.5, 5.6],
    target: [1.3, 0, 0],
    zoom: 0.92,
  },
  theme: {
    background: 0x1c3627,
    fogNear: 20,
    fogFar: 42,
    terrain: 0x31583a,
    gridCenter: 0x223c29,
    gridLine: 0x294b31,
    path: 0x343b3d,
    pathStone: 0x555d60,
    routeColors: [0xffc857, 0x67d5ff],
    tileColors: [0x426b48, 0x4d7650, 0x386342],
  },
  scenery: {
    trees: [
      { x: -0.5, y: -0.5, scale: 0.72 },
      { x: -0.5, y: 0.5, scale: 0.62 },
      { x: 0.5, y: -0.5, scale: 0.68 },
      { x: 0.5, y: 0.5, scale: 0.76 },
    ],
    crystals: [
      { x: -0.47, y: 0.08, color: 0x6ddbea, scale: 0.85 },
      { x: 0.47, y: -0.08, color: 0xa58be8, scale: 0.9 },
    ],
    runes: [
      { x: -0.46, y: -0.36, rotation: 0.22 },
      { x: 0.46, y: 0.36, rotation: Math.PI + 0.18 },
    ],
  },
};
