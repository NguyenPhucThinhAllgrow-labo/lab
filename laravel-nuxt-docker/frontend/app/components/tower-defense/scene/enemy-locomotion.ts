import * as THREE from "three";

const playbackSpeeds = new WeakMap<THREE.Group, Map<THREE.AnimationClip, number>>();

/** Read travel before root motion is removed from a clip. */
export function clipRootTravelSpeed(clip: THREE.AnimationClip): number {
  let speed = 0;
  for (const track of clip.tracks) {
    if (!/(hips|root)\.position$/i.test(track.name) || track.values.length < 6) continue;
    const last = track.values.length - 3;
    const duration = track.times[track.times.length - 1]! - track.times[0]!;
    if (duration <= 0) continue;
    speed = Math.max(speed, Math.hypot(track.values[last]! - track.values[0]!,
      track.values[last + 2]! - track.values[2]!) / duration);
  }
  return speed;
}

/** World units/second at playback 1x, before the live enemy's sceneScale. */
export function walkingPlaybackSpeed(
  template: THREE.Group,
  clip: THREE.AnimationClip,
  characterScale: number,
  rootSpeed = clipRootTravelSpeed(clip),
): number {
  let cached = playbackSpeeds.get(template);
  if (!cached) { cached = new Map(); playbackSpeeds.set(template, cached); }
  const previous = cached.get(clip);
  if (previous !== undefined) return previous;
  let speed = rootSpeed * characterScale;
  {
    // Calibrate all clips against grounded feet, not just in-place bosses.
    // Root travel is a cycle average and can differ from the contact stride.
    // Sampling happens once per template/clip, never in the render loop.
    const sample = template.clone(true);
    const feet: THREE.Bone[] = [];
    sample.traverse((child) => {
      if (child instanceof THREE.Bone && /(?:leftfoot|rightfoot|footl|footr)$/.test(
        child.name.toLowerCase().replace(/[^a-z0-9]/g, ""))) feet.push(child);
    });
    const contactClip = clip.clone();
    for (const track of contactClip.tracks) {
      if (!/(hips|root)\.position$/i.test(track.name) || track.values.length < 3) continue;
      for (let index = 3; index < track.values.length; index += 3) {
        track.values[index] = track.values[0]!;
        track.values[index + 2] = track.values[2]!;
      }
    }
    const mixer = new THREE.AnimationMixer(sample);
    const action = mixer.clipAction(contactClip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const frames = 96;
    const tracks = feet.map(() => [] as THREE.Vector3[]);
    for (let frame = 0; frame <= frames; frame++) {
      mixer.setTime(clip.duration * frame / frames);
      sample.updateMatrixWorld(true);
      feet.forEach((foot, index) => tracks[index]!.push(foot.getWorldPosition(new THREE.Vector3())));
    }
    const stanceSpeeds: number[] = [];
    for (const positions of tracks) {
      const minY = Math.min(...positions.map((p) => p.y));
      const maxY = Math.max(...positions.map((p) => p.y));
      const stanceY = minY + (maxY - minY) * 0.2 + 0.001;
      const spanX = Math.max(...positions.map((p) => p.x)) - Math.min(...positions.map((p) => p.x));
      const spanZ = Math.max(...positions.map((p) => p.z)) - Math.min(...positions.map((p) => p.z));
      const forwardAxis = spanX > spanZ ? "x" : "z";
      for (let index = 1; index < positions.length; index++) {
        const a = positions[index - 1]!; const b = positions[index]!;
        if (a.y > stanceY || b.y > stanceY) continue;
        // Sideways sway is not forward stride distance.
        const velocity = Math.abs(b[forwardAxis] - a[forwardAxis]) / (clip.duration / frames);
        if (Number.isFinite(velocity) && velocity > 0.01) stanceSpeeds.push(velocity);
      }
    }
    stanceSpeeds.sort((a, b) => a - b);
    speed = stanceSpeeds[Math.floor(stanceSpeeds.length / 2)] ?? speed;
    mixer.stopAllAction();
    mixer.uncacheRoot(sample);
  }
  if (!Number.isFinite(speed) || speed < 0.01) {
    // Non-standard rigs still get a size/clip-dependent estimate.
    const height = Number(template.userData.characterHeight) || 1;
    speed = Math.max(0.01, height * 0.45 / Math.max(clip.duration, 0.1));
  }
  cached.set(clip, speed);
  return speed;
}

export function walkingTimeScale(worldSpeed: number, playbackSpeed: number, sceneScale: number) {
  return Math.max(0, worldSpeed) / Math.max(0.01, playbackSpeed * sceneScale);
}
