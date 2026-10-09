import * as THREE from "three";

const contactObjects = new Set([
  "swampIsland", "swampEdgeLand", "swampCastleGround", "swampMarshBanks",
  "swampTowerPlatforms", "swampRockwork", "swampTreeBranches", "swampPathGround",
]);

/** Trace actual submerged geometry once; animate a single shoreline batch on GPU. */
export function createSwampWaterContact(root: THREE.Group, waterY: number) {
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const matrix = new THREE.Matrix4(), instance = new THREE.Matrix4();
  const bounds = new THREE.Box3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const normal = new THREE.Vector3(), edge = new THREE.Vector3();
  const first = new THREE.Vector3(), second = new THREE.Vector3();
  const point = new THREE.Vector3();
  const seen = new Set<string>();
  const maxSegments = 12000;
  const width = 0.55;

  function ribbon(from: THREE.Vector3, to: THREE.Vector3, outward: THREE.Vector3) {
    if (from.distanceToSquared(to) < 0.000001 || indices.length / 6 >= maxSegments) return;
    const key = (p: THREE.Vector3) => `${p.x.toFixed(3)}:${p.z.toFixed(3)}`;
    const ends = [key(from), key(to)].sort().join("|");
    if (seen.has(ends)) return;
    seen.add(ends);
    const start = positions.length / 3;
    for (const [p, distance] of [[from, 0], [to, 0], [from, width], [to, width]] as const) {
      positions.push(p.x + outward.x * distance, waterY + 0.015, p.z + outward.z * distance);
      uvs.push(distance / width, 0);
    }
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !contactObjects.has(object.name)) return;
    const geometry = object.geometry;
    const vertex = geometry.getAttribute("position");
    if (!vertex) return;
    geometry.computeBoundingBox();
    const index = geometry.index;
    const count = index?.count ?? vertex.count;
    const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
    for (let item = 0; item < instances; item++) {
      matrix.multiplyMatrices(inverseRoot, object.matrixWorld);
      if (object instanceof THREE.InstancedMesh) {
        object.getMatrixAt(item, instance); matrix.multiply(instance);
      }
      bounds.copy(geometry.boundingBox!).applyMatrix4(matrix);
      if (bounds.min.y >= waterY || bounds.max.y <= waterY) continue;
      for (let triangle = 0; triangle < count; triangle += 3) {
        a.fromBufferAttribute(vertex, index ? index.getX(triangle) : triangle).applyMatrix4(matrix);
        b.fromBufferAttribute(vertex, index ? index.getX(triangle + 1) : triangle + 1).applyMatrix4(matrix);
        c.fromBufferAttribute(vertex, index ? index.getX(triangle + 2) : triangle + 2).applyMatrix4(matrix);
        let hits = 0;
        for (const [from, to] of [[a, b], [b, c], [c, a]]) {
          const belowFrom = from!.y < waterY, belowTo = to!.y < waterY;
          if (belowFrom === belowTo) continue;
          point.copy(from!).lerp(to!, (waterY - from!.y) / (to!.y - from!.y));
          if (!hits) { first.copy(point); hits++; }
          else if (first.distanceToSquared(point) > 0.000001) { second.copy(point); hits++; }
        }
        if (hits < 2) continue;
        normal.subVectors(b, a).cross(edge.subVectors(c, a));
        normal.y = 0;
        if (normal.lengthSq() < 0.000001) continue;
        normal.normalize();
        ribbon(first, second, normal);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x54776b) } },
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    forceSinglePass: true, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vSurface; varying float vDistance;
      void main(){vSurface=position.xz; vDistance=uv.x;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor;
      varying vec2 vSurface; varying float vDistance;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
          mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
        vec2 drift=vec2(uTime*.0234,-uTime*.0169);
        float patches=noise(vSurface*.75+drift);
        float detail=noise(vSurface*1.8-drift*.6);
        float warpedDistance=vDistance+(patches-.5)*.36+(detail-.5)*.13;
        float wavePhase=warpedDistance*7.-uTime*.715;
        float aa=max(fwidth(wavePhase),.04);
        float crest=pow(max(0.,sin(wavePhase)),4.)/(1.+aa*aa);
        float wetEdge=exp(-vDistance*12.);
        float outerEdge=.52+patches*.4;
        float fade=(1.-smoothstep(outerEdge-.22,outerEdge,vDistance))*smoothstep(0.,.04,vDistance);
        // Sparse, narrow patches rather than bright concentric rings.
        float breakup=smoothstep(.35,.64,patches)*smoothstep(.23,.6,detail);
        float alpha=(crest*.17+wetEdge*.035)*fade*breakup;
        gl_FragColor=vec4(uColor,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "swampWaterContact"; mesh.renderOrder = 1;
  mesh.userData.contactSegments = indices.length / 6;
  root.add(mesh);
  return { mesh, update: (elapsed: number) => { material.uniforms.uTime!.value = elapsed; } };
}
