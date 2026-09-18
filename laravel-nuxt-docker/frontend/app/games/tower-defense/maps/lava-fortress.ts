import type { TowerDefenseMapDefinition } from "~/types/games/towerDefense";
import { collectPathTiles, expandOrthogonalPath } from "./map-utils";

const paths: TowerDefenseMapDefinition["paths"] = [
  expandOrthogonalPath([
    { x: 0, y: 3 },
    { x: 5, y: 3 },
    { x: 5, y: 6 },
    { x: 9, y: 6 },
    { x: 9, y: 4 },
    { x: 17, y: 4 },
  ]),
  expandOrthogonalPath([
    { x: 0, y: 10 },
    { x: 7, y: 10 },
    { x: 7, y: 6 },
    { x: 11, y: 6 },
    { x: 11, y: 4 },
    { x: 17, y: 4 },
  ]),
];

export const lavaFortressMap: TowerDefenseMapDefinition = {
  id: "lava-fortress",
  name: "Pháo đài Dung nham",

  columns: 18,
  rows: 14,

  paths,
  pathTiles: collectPathTiles(paths),

  // Độ tròn khi enemy rẽ; khoảng 0.25–0.45.
  cornerRadius: 0.35,

  castle: {
    modelUrl: "/models/games/tower-defense/castle.glb",
    offsetX: 1.5,
    offsetY: -0.22,
    rotationY: 0,
    maxSize: 8.5,

    // Enemy đi thêm bao nhiêu ô sau tâm ô path cuối.
    pathEndOffset: 0.48,
  },

  camera: {
    position: [5.7, 12.5, 5.6],
    target: [1.3, 0, 0],
    zoom: 0.92,
  },

  theme: {
    background: 0x09070d,
    fogNear: 18,
    fogFar: 39,

    terrain: 0x09070a,
    gridCenter: 0x5c1710,
    gridLine: 0x211116,

    path: 0x34383c,
    pathStone: 0x555d60,

    routeColors: [0xff7a29, 0xffd166],
    tileColors: [0x332326, 0x271d21, 0x1d181b],
  },

  scenery: {
    trees: [],
    crystals: [
      { x: -0.47, y: 0.08, color: 0xff521c, scale: 0.9 },
      { x: 0.47, y: -0.08, color: 0xffa229, scale: 1 },
    ],
    runes: [
      { x: -0.46, y: -0.36, rotation: 0.2 },
      { x: 0.46, y: 0.36, rotation: Math.PI },
    ],
  },
};