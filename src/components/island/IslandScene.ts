import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createWorld,
  inPond,
  isWalkable,
  LAYOUT,
  step,
  type Command,
  type FishKind,
  type FishingPhase,
  type Vec2,
  type WorldState,
} from '@/lib/island/world';

export interface IslandSnapshot {
  readonly phase: FishingPhase;
  readonly caught: number;
  readonly lastFish: FishKind | null;
}

export interface IslandSceneOptions {
  readonly reducedMotion: boolean;
  readonly onSnapshot: (snapshot: IslandSnapshot) => void;
  readonly onReady: () => void;
  readonly onError: (error: unknown) => void;
}

const FISH_TINT: Record<FishKind, string> = {
  minnow: '#9fb8cc',
  goby: '#d2a86c',
  trout: '#8fb07c',
  koi: '#f2894b',
  moonCarp: '#ece6f7',
  lilyLeaf: '#6ab26b',
};

const ROD_PHASES: ReadonlySet<FishingPhase> = new Set(['casting', 'waiting', 'bite', 'caught']);

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), s | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function part(root: THREE.Object3D, prefix: string): THREE.Object3D {
  let found: THREE.Object3D | undefined;
  root.traverse((child) => {
    if (!found && child.name.startsWith(prefix)) found = child;
  });
  if (!found) throw new Error(`Missing Blender part ${prefix}`);
  return found;
}

function instanced(template: THREE.Object3D, placements: readonly THREE.Matrix4[], castShadow: boolean): THREE.Group {
  const group = new THREE.Group();
  template.updateMatrixWorld(true);
  const inverseRoot = template.matrixWorld.clone().invert();
  template.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const relative = inverseRoot.clone().multiply(child.matrixWorld);
    const mesh = new THREE.InstancedMesh(child.geometry, child.material, placements.length);
    placements.forEach((placement, index) => mesh.setMatrixAt(index, placement.clone().multiply(relative)));
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

function placement(x: number, z: number, scale: number, rotation: number, y = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation),
    new THREE.Vector3(scale, scale, scale),
  );
}

function clearOfObstacles(x: number, z: number, padding: number): boolean {
  const point: Vec2 = [x, z];
  if (Math.hypot(x, z) > LAYOUT.islandRadius - 0.6) return false;
  if (inPond(point, 0.45 + padding)) return false;
  if (x > LAYOUT.dock.minX - 0.3 && x < LAYOUT.dock.maxX && Math.abs(z - LAYOUT.dock.centerZ) < 0.8) return false;
  return [...LAYOUT.trees, ...LAYOUT.rocks].every((o) => Math.hypot(x - o.center[0], z - o.center[1]) > o.radius + 0.35 + padding);
}

const WATER_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const WATER_FRAGMENT = `
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  vec3 deep = vec3(0.18, 0.55, 0.6);
  vec3 shallow = vec3(0.5, 0.8, 0.76);
  vec3 color = mix(deep, shallow, smoothstep(0.2, 0.98, r));
  float wave = sin(p.x * 8.0 + uTime * 0.7 + sin(p.y * 5.0 + uTime * 0.4)) * sin(p.y * 10.0 - uTime * 0.5);
  color += smoothstep(0.86, 1.0, wave) * 0.16;
  color = mix(color, vec3(0.95, 0.97, 0.9), smoothstep(0.9, 1.0, r) * 0.55);
  gl_FragColor = vec4(color, 1.0);
}`;

interface Ripple {
  readonly mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
  life: number;
}

interface Swayer {
  readonly object: THREE.Object3D;
  readonly offset: number;
}

interface Drifter {
  readonly object: THREE.Object3D;
  readonly speed: number;
  readonly offset: number;
  readonly size: number;
}

export class IslandScene {
  private readonly host: HTMLElement;
  private readonly options: IslandSceneOptions;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(26, 1, 0.5, 120);
  private readonly timer = new THREE.Clock(false);
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly resizeObserver: ResizeObserver;
  private readonly disposables = new Set<{ dispose: () => void }>();
  private readonly ripples: Ripple[] = [];
  private readonly swayers: Swayer[] = [];
  private readonly clouds: Drifter[] = [];
  private readonly butterflies: { object: THREE.Object3D; wings: THREE.Object3D[]; offset: number }[] = [];
  private readonly leaves: THREE.Object3D[] = [];
  private readonly fishShadows: THREE.Mesh[] = [];
  private readonly random = seeded(42);

  private state: WorldState = createWorld(Date.now() % 100000);
  private axis: Vec2 = [0, 0];
  private pending: Command[] = [];
  private reducedMotion: boolean;
  private paused = false;
  private disposed = false;
  private frameHandle = 0;
  private time = 0;
  private drift = 0;
  private waddle = 0;
  private walkBlend = 0;
  private rippleTimer = 0;
  private gustClock = 5;
  private gust = 0;
  private lastSnapshot = '';
  private lastAttributes = '';
  private waterUniforms = { uTime: { value: 0 } };

  private penguin: THREE.Object3D | null = null;
  private parts: Record<string, THREE.Object3D> = {};
  private bobber: THREE.Object3D | null = null;
  private fishDisplay: THREE.Object3D | null = null;
  private fishMaterial: THREE.MeshStandardMaterial | null = null;
  private biteMarker: THREE.Sprite | null = null;
  private line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;

  constructor(host: HTMLElement, options: IslandSceneOptions) {
    this.host = host;
    this.options = options;
    this.reducedMotion = options.reducedMotion;
    host.dataset.motion = options.reducedMotion ? 'reduced' : 'full';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'island-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    host.appendChild(this.renderer.domElement);

    this.setupLights();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    document.addEventListener('visibilitychange', this.onVisibility);
    void this.load();
  }

  command(command: Command): void {
    this.pending.push(command);
  }

  setAxis(axis: Vec2): void {
    this.axis = axis;
  }

  nudge(direction: Vec2): void {
    const [x, z] = this.state.position;
    this.command({ type: 'tap', point: [x + direction[0] * 1.6, z + direction[1] * 1.6] });
  }

  tapAt(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, new THREE.Vector3());
    if (hit && Math.hypot(hit.x, hit.z) < LAYOUT.islandRadius + 0.5) this.command({ type: 'tap', point: [hit.x, hit.z] });
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.host.dataset.motion = reduced ? 'reduced' : 'full';
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.axis = [0, 0];
    this.pending = [];
    cancelAnimationFrame(this.frameHandle);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: THREE.Material) => material.dispose());
      }
    });
    this.disposables.forEach((item) => item.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly onContextLost = () => {
    if (this.disposed) return;
    this.dispose();
    this.options.onError(new Error('WebGL context lost'));
  };

  private readonly onVisibility = () => {
    this.paused = document.hidden;
    if (!this.paused && !this.disposed && this.penguin) {
      this.timer.getDelta();
      this.schedule();
    }
  };

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xfff0d8, 0x7c9a57, 1.55));
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.3);
    sun.position.set(-7, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -11;
    sun.shadow.camera.right = 11;
    sun.shadow.camera.top = 11;
    sun.shadow.camera.bottom = -11;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffc9a8, 0.45);
    fill.position.set(8, 5, -6);
    this.scene.add(fill);
  }

  private async load(): Promise<void> {
    try {
      const loader = new GLTFLoader();
      const [world, penguin] = await Promise.all([loader.loadAsync('/island/world.glb'), loader.loadAsync('/island/penguin.glb')]);
      if (this.disposed) {
        [world, penguin].forEach((gltf) => this.disposeGltf(gltf));
        return;
      }
      this.buildWorld(world.scene);
      this.buildPenguin(penguin.scene);
      this.timer.start();
      this.options.onReady();
      this.emit();
      this.schedule();
    } catch (error) {
      if (!this.disposed) this.options.onError(error);
    }
  }

  private disposeGltf(gltf: GLTF): void {
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((m: THREE.Material) => m.dispose());
      }
    });
  }

  private template(source: THREE.Object3D, name: string): THREE.Object3D {
    const found = source.getObjectByName(name);
    if (!found) throw new Error(`Missing Blender asset ${name}`);
    return found;
  }

  private shadowed<T extends THREE.Object3D>(object: T, cast = true): T {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = cast;
        child.receiveShadow = true;
      }
    });
    return object;
  }

  private buildWorld(source: THREE.Object3D): void {
    const island = this.shadowed(this.template(source, 'Island').clone(), false);
    this.scene.add(island);

    const { center, radiusX, radiusZ } = LAYOUT.pond;
    const shore = this.shadowed(this.template(source, 'PondShore').clone(), false);
    shore.position.set(center[0], 0, center[1]);
    shore.scale.set(radiusX, 1, radiusZ);
    this.scene.add(shore);

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({ uniforms: this.waterUniforms, vertexShader: WATER_VERTEX, fragmentShader: WATER_FRAGMENT }),
    );
    water.position.set(center[0], 0.02, center[1]);
    water.scale.set(radiusX, 1, radiusZ);
    this.scene.add(water);

    const shadowGeometry = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x1d4f55, transparent: true, opacity: 0.32, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const fish = new THREE.Mesh(shadowGeometry, shadowMaterial);
      fish.scale.set(0.1, 1, 0.26);
      fish.position.y = 0.03;
      this.fishShadows.push(fish);
      this.scene.add(fish);
    }

    const ringGeometry = new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xf6fbf2, transparent: true, opacity: 0, depthWrite: false }));
      mesh.visible = false;
      this.ripples.push({ mesh, age: 0, life: 1 });
      this.scene.add(mesh);
    }

    const dock = this.shadowed(this.template(source, 'Dock').clone());
    dock.position.set(LAYOUT.dock.minX, 0, LAYOUT.dock.centerZ);
    this.scene.add(dock);

    LAYOUT.trees.forEach((tree, index) => {
      const object = this.shadowed(this.template(source, tree.variant === 'pine' ? 'TreePine' : 'TreeRound').clone());
      const scale = 1.05 + this.random() * 0.35;
      object.position.set(tree.center[0], 0, tree.center[1]);
      object.scale.setScalar(scale);
      object.rotation.y = this.random() * Math.PI * 2;
      this.scene.add(object);
      this.swayers.push({ object: part(object, 'Canopy'), offset: index * 1.7 });
    });

    LAYOUT.rocks.forEach((rock) => {
      const object = this.shadowed(this.template(source, 'Rock').clone());
      object.position.set(rock.center[0], 0, rock.center[1]);
      object.scale.setScalar(rock.radius / 0.45);
      object.rotation.y = this.random() * 6;
      this.scene.add(object);
    });

    const scatter = (count: number, padding: number, scaleRange: [number, number], filter: (x: number, z: number) => boolean = () => true) => {
      const result: THREE.Matrix4[] = [];
      for (let attempt = 0; attempt < count * 30 && result.length < count; attempt++) {
        const angle = this.random() * Math.PI * 2;
        const radius = Math.sqrt(this.random()) * (LAYOUT.islandRadius - 0.7);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        if (!clearOfObstacles(x, z, padding) || !filter(x, z)) continue;
        result.push(placement(x, z, scaleRange[0] + this.random() * (scaleRange[1] - scaleRange[0]), this.random() * 6.28));
      }
      return result;
    };

    const bushes = scatter(9, 0.4, [0.8, 1.3], (x, z) => Math.hypot(x, z) > 5.5);
    this.scene.add(instanced(this.template(source, 'Bush'), bushes, true));
    this.scene.add(instanced(this.template(source, 'GrassTuft'), scatter(90, 0, [0.8, 1.5]), false));
    for (const color of ['petalPink', 'petalYellow', 'petalWhite', 'petalLilac']) {
      this.scene.add(instanced(this.template(source, `Flower_${color}`), scatter(16, 0, [0.9, 1.4]), false));
    }
    this.scene.add(instanced(this.template(source, 'Mushroom'), scatter(6, 0.1, [0.9, 1.5], (x, z) => Math.hypot(x, z) > 4), true));

    const stones: THREE.Matrix4[] = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const x = LAYOUT.spawn[0] + (LAYOUT.dock.minX - 0.3 - LAYOUT.spawn[0]) * t + Math.sin(t * 5) * 0.25;
      const z = LAYOUT.spawn[1] + 0.8 + (LAYOUT.dock.centerZ + 0.2 - LAYOUT.spawn[1] - 0.8) * t;
      if (isWalkable([x, z])) stones.push(placement(x, z, 0.9 + (i % 2) * 0.2, i * 1.3, 0.005));
    }
    this.scene.add(instanced(this.template(source, 'SteppingStone'), stones, false));

    const reedSpots: THREE.Matrix4[] = [];
    [0.35, 0.9, 1.3, 2.3, 2.9, 4.2, 4.8, 5.6].forEach((angle) => {
      const x = center[0] + Math.cos(angle) * (radiusX + 0.05);
      const z = center[1] + Math.sin(angle) * (radiusZ + 0.05);
      if (Math.abs(z - LAYOUT.dock.centerZ) > 0.9 || x > 0.5) reedSpots.push(placement(x, z, 0.9 + this.random() * 0.4, this.random() * 6));
    });
    const reeds = instanced(this.template(source, 'Reeds'), reedSpots, true);
    this.scene.add(reeds);

    const lilyPads: THREE.Matrix4[] = [];
    const lilyFlowers: THREE.Matrix4[] = [];
    [
      [2.6, 0.2],
      [3.6, -1.9],
      [2.2, -2.4],
      [4.0, -0.4],
      [0.9, 0.3],
    ].forEach(([x, z], i) => (i % 2 ? lilyFlowers : lilyPads).push(placement(x, z, 1 + this.random() * 0.4, this.random() * 6, 0.035)));
    this.scene.add(instanced(this.template(source, 'LilyPad'), lilyPads, false));
    this.scene.add(instanced(this.template(source, 'LilyFlower'), lilyFlowers, false));

    for (let i = 0; i < 4; i++) {
      const cloud = this.template(source, 'Cloud').clone();
      cloud.position.set(0, 3.2 + (i % 2) * 1.1, -13 - (i % 3) * 1.5);
      this.clouds.push({ object: cloud, speed: 0.18 + i * 0.04, offset: i * 6, size: 1 + (i % 2) * 0.4 });
      this.scene.add(cloud);
    }

    for (let i = 0; i < 2; i++) {
      const butterfly = this.template(source, 'Butterfly').clone();
      butterfly.scale.setScalar(1.6);
      this.butterflies.push({ object: butterfly, wings: [part(butterfly, 'Wing_L'), part(butterfly, 'Wing_R')], offset: i * 3.1 });
      this.scene.add(butterfly);
    }

    for (let i = 0; i < 12; i++) {
      const leaf = this.template(source, 'Leaf').clone();
      leaf.visible = false;
      leaf.scale.setScalar(1.8);
      this.leaves.push(leaf);
      this.scene.add(leaf);
    }

    const bobber = this.template(source, 'Bobber').clone();
    bobber.visible = false;
    this.bobber = bobber;
    this.scene.add(bobber);

    const fish = this.template(source, 'Fish').clone();
    this.fishMaterial = new THREE.MeshStandardMaterial({ color: FISH_TINT.koi, roughness: 0.6 });
    this.disposables.add(this.fishMaterial);
    fish.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.startsWith('FishBody')) child.material = this.fishMaterial;
      if (child instanceof THREE.Mesh && child.name.startsWith('FishTail')) child.material = this.fishMaterial;
    });
    fish.visible = false;
    fish.scale.setScalar(1.6);
    this.fishDisplay = fish;
    this.scene.add(fish);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#fff7e6';
      context.beginPath();
      context.arc(32, 32, 28, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#e0892a';
      context.font = 'bold 44px Georgia, serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('!', 32, 35);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.disposables.add(texture);
    this.biteMarker = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    this.biteMarker.scale.setScalar(0.55);
    this.biteMarker.visible = false;
    this.scene.add(this.biteMarker);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new THREE.Vector3()));
    this.line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xfff8ec, transparent: true, opacity: 0.85 }));
    this.line.visible = false;
    this.line.frustumCulled = false;
    this.scene.add(this.line);
  }

  private buildPenguin(source: THREE.Object3D): void {
    const penguin = this.shadowed(source.getObjectByName('Penguin') ?? source);
    penguin.scale.setScalar(1.3);
    for (const name of ['Body', 'Head', 'Flipper_L', 'Flipper_R', 'Foot_L', 'Foot_R', 'Eye_L', 'Eye_R', 'Rod', 'RodTip', 'ScarfTail']) {
      this.parts[name] = part(penguin, name);
    }
    this.parts.Rod.visible = false;
    this.penguin = penguin;
    this.scene.add(penguin);
  }

  private resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.aspect = aspect;
    const wide = aspect > 1.25;
    const fitHeight = wide ? 17 : 14.5;
    const fitWidth = wide ? 25.5 : 20.5;
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const distance = Math.max(fitHeight / (2 * Math.tan(halfFov)), fitWidth / (2 * Math.tan(halfFov) * aspect));
    const direction = new THREE.Vector3(0, 0.84, 1).normalize();
    const target = new THREE.Vector3(wide ? -1.2 : 0.2, 0, wide ? 1.3 : 0.9);
    this.camera.position.copy(target).addScaledVector(direction, distance);
    this.camera.lookAt(target);
    if (wide) this.camera.setViewOffset(width, height, -width * 0.14, 0, width, height);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.exposeLandmarks(width, height);
    if (this.penguin) this.renderer.render(this.scene, this.camera);
  }

  private exposeLandmarks(width: number, height: number): void {
    const landmarks: [string, Vec2][] = [
      ['pond', LAYOUT.pond.center],
      ['meadow', [-3.2, 4.6]],
    ];
    this.camera.updateMatrixWorld();
    for (const [name, [x, z]] of landmarks) {
      const projected = new THREE.Vector3(x, 0, z).project(this.camera);
      this.host.dataset[`${name}X`] = String(Math.round(((projected.x + 1) / 2) * width));
      this.host.dataset[`${name}Y`] = String(Math.round(((1 - projected.y) / 2) * height));
    }
  }

  private schedule(): void {
    cancelAnimationFrame(this.frameHandle);
    if (!this.disposed && !this.paused) this.frameHandle = requestAnimationFrame(this.frame);
  }

  private readonly frame = () => {
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.time += dt;
    this.state = step(this.state, { axis: this.axis, commands: this.pending }, dt);
    this.pending = [];
    this.animate(dt);
    this.renderer.render(this.scene, this.camera);
    this.emit();
    this.schedule();
  };

  private animate(dt: number): void {
    const motion = this.reducedMotion ? 0 : 1;
    const t = this.time;
    this.waterUniforms.uTime.value = t * motion;

    this.gustClock -= dt * motion;
    if (this.gustClock <= 0) this.gustClock = 11 + this.random() * 7;
    const gustProgress = 1 - this.gustClock / 3.5;
    this.gust = motion && this.gustClock < 3.5 ? Math.sin(Math.PI * Math.min(1, Math.max(0, 1 - this.gustClock / 3.5))) : 0;
    this.host.dataset.breeze = this.gust > 0.2 ? 'gust' : 'calm';

    for (const swayer of this.swayers) {
      const base = Math.sin(t * 1.1 + swayer.offset) * 0.025 * motion;
      swayer.object.rotation.z = base + this.gust * 0.09 * Math.sin(t * 3 + swayer.offset * 0.3);
      swayer.object.rotation.x = Math.cos(t * 0.9 + swayer.offset) * 0.02 * motion;
    }

    this.drift += dt * motion;
    this.clouds.forEach((cloud) => {
      const x = ((this.drift * cloud.speed + cloud.offset) % 24) - 8;
      cloud.object.position.x = x;
      cloud.object.scale.setScalar(cloud.size * Math.min(1, (x + 8) / 3, (16 - x) / 3));
    });

    this.butterflies.forEach(({ object, wings, offset }) => {
      const s = t * 0.35 + offset;
      object.position.set(Math.sin(s) * 4.2 - 2.2, 0.9 + Math.sin(t * 2.3 + offset) * 0.25, Math.sin(s * 2) * 1.8 + 3.2 - offset);
      object.rotation.y = Math.atan2(Math.cos(s) * 4.2, Math.cos(s * 2) * 3.6);
      const flap = Math.sin(t * 16 + offset) * 0.9 * motion;
      wings[0].rotation.z = flap;
      wings[1].rotation.z = -flap;
      object.visible = motion === 1;
    });

    this.leaves.forEach((leaf, index) => {
      const active = this.gust > 0.02;
      leaf.visible = active;
      if (!active) return;
      const u = Math.max(0, Math.min(1, gustProgress * 1.2 - (index % 4) * 0.08));
      leaf.position.set(-12 + u * 24, 1 + (index % 3) * 0.7 + Math.sin(t * 3 + index) * 0.3, -4 + (index * 1.3) % 9);
      leaf.rotation.set(t * 3 + index, t * 2, t * 4 + index);
    });

    const { center, radiusX, radiusZ } = LAYOUT.pond;
    const phase = this.state.fishing.kind;
    this.fishShadows.forEach((fish, index) => {
      const s = t * (0.25 + index * 0.07) * motion + index * 2.1;
      let x = center[0] + Math.cos(s) * radiusX * 0.55;
      let z = center[1] + Math.sin(s * 1.3) * radiusZ * 0.5;
      if (index === 0 && (phase === 'bite' || phase === 'waiting')) {
        const pull = phase === 'bite' ? 1 : 0.35;
        x += (LAYOUT.bobber[0] + 0.15 - x) * pull;
        z += (LAYOUT.bobber[1] + 0.1 - z) * pull;
      }
      fish.rotation.y = Math.atan2(-Math.sin(s) * radiusX, Math.cos(s * 1.3) * radiusZ) + Math.PI;
      fish.position.x = x;
      fish.position.z = z;
    });

    this.rippleTimer -= dt;
    if (this.rippleTimer <= 0 && motion) {
      this.rippleTimer = phase === 'bite' ? 0.45 : 1.3 + this.random();
      if (phase === 'bite' || phase === 'waiting') this.spawnRipple(LAYOUT.bobber[0], LAYOUT.bobber[1], 0.55);
      else {
        const a = this.random() * Math.PI * 2;
        this.spawnRipple(center[0] + Math.cos(a) * radiusX * 0.6 * this.random(), center[1] + Math.sin(a) * radiusZ * 0.6 * this.random(), 0.45);
      }
    }
    for (const ripple of this.ripples) {
      if (!ripple.mesh.visible) continue;
      ripple.age += dt;
      const u = ripple.age / ripple.life;
      if (u >= 1) {
        ripple.mesh.visible = false;
        continue;
      }
      ripple.mesh.scale.setScalar(0.12 + u * 0.55);
      ripple.mesh.material.opacity = 0.7 * (1 - u);
    }

    this.animatePenguin(dt, motion);
  }

  private spawnRipple(x: number, z: number, life: number): void {
    const ripple = this.ripples.find((r) => !r.mesh.visible) ?? this.ripples[0];
    ripple.mesh.position.set(x, 0.04, z);
    ripple.mesh.visible = true;
    ripple.age = 0;
    ripple.life = life * 2.4;
  }

  private animatePenguin(dt: number, motion: number): void {
    const penguin = this.penguin;
    if (!penguin) return;
    const { position, velocity, facing, fishing } = this.state;
    const speed = Math.hypot(velocity[0], velocity[1]);
    this.walkBlend += ((speed > 0.1 ? 1 : 0) - this.walkBlend) * Math.min(1, dt * 10);
    this.waddle += dt * (4 + speed * 3.2);
    const w = Math.sin(this.waddle * 2);
    const t = this.time;
    const idle = Math.sin(t * 2.2) * motion;

    penguin.position.set(position[0], Math.abs(w) * 0.07 * this.walkBlend, position[1]);
    penguin.rotation.y = facing;
    const body = this.parts.Body;
    body.rotation.z = w * 0.13 * this.walkBlend;
    body.scale.y = 1 + idle * 0.015 * (1 - this.walkBlend);
    this.parts.Head.rotation.z = -w * 0.06 * this.walkBlend + Math.sin(t * 0.7) * 0.04 * motion;
    this.parts.Foot_L.rotation.x = w * 0.6 * this.walkBlend;
    this.parts.Foot_R.rotation.x = -w * 0.6 * this.walkBlend;
    this.parts.ScarfTail.rotation.x = 0.1 + Math.sin(t * 3) * 0.12 * motion + this.gust * 0.5 + this.walkBlend * 0.25;

    const blink = motion && t % 4.3 < 0.12 ? 0.15 : 1;
    this.parts.Eye_L.scale.y = blink;
    this.parts.Eye_R.scale.y = blink;

    let rightFlipper = -(0.25 + Math.abs(w) * 0.35 * this.walkBlend + idle * 0.04);
    const leftFlipper = 0.25 + Math.abs(w) * 0.35 * this.walkBlend + idle * 0.04;
    let rightLift = 0;
    const rod = this.parts.Rod;
    rod.visible = ROD_PHASES.has(fishing.kind);

    const bobber = this.bobber;
    const tip = this.parts.RodTip.getWorldPosition(new THREE.Vector3());
    const bobberTarget = new THREE.Vector3(LAYOUT.bobber[0], 0.03, LAYOUT.bobber[1]);
    let bobberVisible = false;
    let bobberPosition = bobberTarget.clone();

    switch (fishing.kind) {
      case 'casting': {
        const u = Math.min(1, fishing.t / 0.6);
        rightLift = u < 0.45 ? 1.1 * (u / 0.45) : 1.1 - 1.9 * ((u - 0.45) / 0.55);
        bobberVisible = u > 0.45;
        const arc = Math.max(0, (u - 0.45) / 0.55);
        bobberPosition = tip.clone().lerp(bobberTarget, arc);
        bobberPosition.y += Math.sin(arc * Math.PI) * 0.8;
        if (u > 0.95 && this.ripples.every((r) => !r.mesh.visible || r.age > 0.2)) this.spawnRipple(bobberTarget.x, bobberTarget.z, 0.6);
        break;
      }
      case 'waiting':
        rightLift = -0.8 + Math.sin(t * 1.5) * 0.03 * motion;
        bobberVisible = true;
        bobberPosition.y += Math.sin(t * 2.4) * 0.02 * motion;
        break;
      case 'bite':
        rightLift = -0.8 + Math.sin(t * 22) * 0.08 * motion;
        bobberVisible = true;
        bobberPosition.y += -0.05 + Math.sin(t * 14) * 0.035 * motion;
        break;
      case 'caught':
        rightLift = -2.1;
        break;
      case 'idle':
      case 'walking-to-pond':
        break;
    }
    if (rightLift !== 0) rightFlipper = 0;
    this.parts.Flipper_L.rotation.z = leftFlipper;
    this.parts.Flipper_R.rotation.z = rightFlipper;
    this.parts.Flipper_R.rotation.x = rightLift;

    if (bobber) {
      bobber.visible = bobberVisible;
      bobber.position.copy(bobberPosition);
    }
    if (this.line) {
      this.line.visible = bobberVisible;
      if (bobberVisible) {
        const points = this.line.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < points.count; i++) {
          const u = i / (points.count - 1);
          const p = tip.clone().lerp(bobberPosition, u);
          p.y -= Math.sin(u * Math.PI) * 0.18;
          points.setXYZ(i, p.x, p.y, p.z);
        }
        points.needsUpdate = true;
      }
    }

    if (this.biteMarker) {
      this.biteMarker.visible = fishing.kind === 'bite';
      this.biteMarker.position.set(position[0], 2.0 + Math.sin(t * 6) * 0.06 * motion, position[1]);
    }

    if (this.fishDisplay && this.fishMaterial) {
      const caught = fishing.kind === 'caught';
      this.fishDisplay.visible = caught;
      if (caught) {
        this.fishMaterial.color.set(FISH_TINT[fishing.fish]);
        this.fishDisplay.position.set(position[0], 2.05 + Math.sin(t * 2.5) * 0.08 * motion, position[1]);
        this.fishDisplay.rotation.set(0, t * 1.2 * motion + 0.6, Math.PI / 2 + Math.sin(t * 5) * 0.2 * motion);
      }
    }
  }

  private emit(): void {
    const { fishing, caught, position } = this.state;
    const snapshotKey = `${fishing.kind}|${caught.length}`;
    if (snapshotKey !== this.lastSnapshot) {
      this.lastSnapshot = snapshotKey;
      this.options.onSnapshot({ phase: fishing.kind, caught: caught.length, lastFish: caught.at(-1) ?? null });
    }
    const attributes = `${fishing.kind}|${position[0].toFixed(2)}|${position[1].toFixed(2)}|${caught.length}`;
    if (attributes !== this.lastAttributes) {
      this.lastAttributes = attributes;
      this.host.dataset.phase = fishing.kind;
      this.host.dataset.x = position[0].toFixed(2);
      this.host.dataset.z = position[1].toFixed(2);
      this.host.dataset.caught = String(caught.length);
    }
  }
}
