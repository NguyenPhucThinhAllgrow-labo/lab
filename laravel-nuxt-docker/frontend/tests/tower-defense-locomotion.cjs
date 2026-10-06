const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const THREE = require("three");
const exportsObject = {};
new Function("require", "exports", ts.transpileModule(fs.readFileSync(path.join(__dirname,
  "../app/components/tower-defense/scene/enemy-locomotion.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(require, exportsObject);
const { clipRootTravelSpeed, walkingPlaybackSpeed, walkingTimeScale } = exportsObject;

// Load animation/bone data from the shipped GLBs without browser texture APIs.
function animationAsset(relativePath, clipName, characterScale) {
  const bytes = fs.readFileSync(path.join(__dirname,
    "../../backend/storage/app/tower-defense/assets/models/games/tower-defense", relativePath));
  const jsonLength = bytes.readUInt32LE(12);
  const data = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const bin = 28 + jsonLength;
  const joints = new Set(data.skins?.flatMap((skin) => skin.joints) ?? []);
  const nodes = data.nodes.map((node, index) => {
    const object = joints.has(index) ? new THREE.Bone() : new THREE.Object3D();
    object.name = THREE.PropertyBinding.sanitizeNodeName(node.name || `node${index}`);
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
    if (node.matrix) new THREE.Matrix4().fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    return object;
  });
  data.nodes.forEach((node, index) => (node.children ?? []).forEach((child) => nodes[index].add(nodes[child])));
  const template = new THREE.Group();
  const character = new THREE.Group();
  character.scale.setScalar(characterScale);
  for (const index of data.scenes[data.scene ?? 0].nodes) character.add(nodes[index]);
  template.add(character);
  function accessor(index) {
    const a = data.accessors[index]; const v = data.bufferViews[a.bufferView];
    assert.equal(a.componentType, 5126);
    const size = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    const offset = bin + (v.byteOffset || 0) + (a.byteOffset || 0);
    return Float32Array.from({ length: a.count * size }, (_, i) => bytes.readFloatLE(offset + i * 4));
  }
  const animation = data.animations.find((a) => a.name === clipName);
  const tracks = animation.channels.map((channel) => {
    const sampler = animation.samplers[channel.sampler];
    const property = { translation: "position", rotation: "quaternion", scale: "scale" }[channel.target.path];
    const Track = property === "quaternion" ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
    return new Track(`${nodes[channel.target.node].name}.${property}`, accessor(sampler.input), accessor(sampler.output));
  });
  return { template, clip: new THREE.AnimationClip(clipName, -1, tracks) };
}

const soldier = animationAsset("character/normal.glb", "walk", 2);
const travel = clipRootTravelSpeed(soldier.clip);
assert.ok(Math.abs(travel - 1.627 / (7 / 3)) < 0.001);
// Simulate a normalized (in-place) soldier clip with preserved root travel.
const normalized = soldier.clip.clone();
for (const track of normalized.tracks) {
  if (!/hips\.position$/i.test(track.name)) continue;
  for (let i = 3; i < track.values.length; i += 3) {
    track.values[i] = track.values[0]; track.values[i + 2] = track.values[2];
  }
}
const soldierSpeed = walkingPlaybackSpeed(soldier.template, normalized, 2, travel);
assert.ok(soldierSpeed > travel * 2 * 0.75 && soldierSpeed < travel * 2 * 1.25);
assert.ok(Math.abs(soldierSpeed - travel * 2) > 0.02, "ground-contact speed must not blindly use root average");
const rawSoldierSpeed = walkingPlaybackSpeed(soldier.template, soldier.clip, 2);
assert.ok(Math.abs(rawSoldierSpeed - soldierSpeed) < 1e-5, "calibration must strip root travel before measuring feet");
const boss = animationAsset("kit/adventure/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb", "Walking_A", 0.78);
assert.ok(clipRootTravelSpeed(boss.clip) < 0.001);
const bossSpeed = walkingPlaybackSpeed(boss.template, boss.clip, 0.78);
assert.ok(bossSpeed > 0.01 && Number.isFinite(bossSpeed));
assert.equal(walkingPlaybackSpeed(boss.template, boss.clip, 0.78), bossSpeed);
for (const speed of [soldierSpeed, bossSpeed]) {
  for (const scale of [0.494, 1.2844, 2.6, 2.73]) {
    for (const worldSpeed of [0, 0.3, 1.5, 3, 6]) {
      const playback = walkingTimeScale(worldSpeed, speed, scale);
      assert.ok(Math.abs(playback * speed * scale - worldSpeed) < 1e-9);
    }
    assert.equal(walkingTimeScale(0, speed, scale), 0);
  }
}
// Exercise the actual render-loop calculation, including first frame, turns,
// freeze, and reuse from a model pool (which must not count teleport distance).
const sceneSource = fs.readFileSync(path.join(__dirname,
  "../app/components/tower-defense/scene/enemy-scene.ts"), "utf8");
const begin = sceneSource.indexOf("const walkPosition = model.userData.walkPosition");
const end = sceneSource.indexOf("model.position.copy(", begin);
const syncWalk = new Function("model", "position", "frozen", "frameDelta", "walkingTimeScale",
  ts.transpileModule(sceneSource.slice(begin, end), {}).outputText + "\nreturn animationTimeScale;");
for (const fps of [30, 60, 144]) {
  const model = new THREE.Group();
  Object.assign(model.userData, { walkPosition: new THREE.Vector2(), hasWalkPosition: false,
    walkPlaybackSpeed: bossSpeed, sceneScale: 2.6 });
  let expectedDistance = 0; let animatedDistance = 0;
  let previous = new THREE.Vector3(0, 5.3, 0);
  assert.equal(syncWalk(model, previous, false, 1 / fps, walkingTimeScale), 0);
  for (let frame = 1; frame <= fps; frame++) {
    const p = new THREE.Vector3(Math.sin(frame / fps), 5.3 + frame / fps, frame / fps);
    expectedDistance += Math.hypot(p.x - previous.x, p.z - previous.z);
    animatedDistance += syncWalk(model, p, false, 1 / fps, walkingTimeScale) / fps * bossSpeed * 2.6;
    previous = p;
  }
  assert.ok(Math.abs(animatedDistance - expectedDistance) < 1e-9);
  assert.equal(syncWalk(model, previous, true, 1 / fps, walkingTimeScale), 0);
  model.userData.hasWalkPosition = false;
  assert.equal(syncWalk(model, new THREE.Vector3(100, 0, 0), false, 1 / fps, walkingTimeScale), 0);
}
console.log(`PASS: real soldier/boss clips; scale, slow, stop, turns, pooling and 30/60/144 FPS (base ${soldierSpeed.toFixed(3)}/${bossSpeed.toFixed(3)} units/s)`);
