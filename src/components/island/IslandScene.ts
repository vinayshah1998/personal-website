import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createWorld,
  inPond,
  isWalkable,
  LAYOUT,
  OBSTACLES,
  onDock,
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
  readonly onInteract?: (target: Interaction) => void;
  readonly onStep?: (surface: 'grass' | 'wood') => void;
}

export type Interaction = 'pat' | 'tree' | 'sign' | 'fire';

type Emote = 'heart' | 'note' | 'sparkle' | 'spark';

interface Particle {
  readonly sprite: THREE.Sprite;
  kind: Emote | null;
  age: number;
  life: number;
  readonly velocity: THREE.Vector3;
}

interface Puff {
  readonly mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  readonly offset: number;
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
  return OBSTACLES.every((o) => Math.hypot(x - o.center[0], z - o.center[1]) > o.radius + 0.35 + padding);
}

function emoteTexture(kind: Emote): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    c.lineJoin = 'round';
    if (kind === 'heart') {
      c.beginPath();
      c.moveTo(32, 54);
      c.bezierCurveTo(4, 36, 6, 10, 22, 10);
      c.bezierCurveTo(28, 10, 32, 16, 32, 20);
      c.bezierCurveTo(32, 16, 36, 10, 42, 10);
      c.bezierCurveTo(58, 10, 60, 36, 32, 54);
      c.fillStyle = '#ff7a95';
      c.strokeStyle = '#fff7ee';
      c.lineWidth = 5;
      c.stroke();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.beginPath();
      c.ellipse(21, 21, 5, 3.5, -0.6, 0, Math.PI * 2);
      c.fill();
    } else if (kind === 'note') {
      c.font = 'bold 46px Georgia, serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.strokeStyle = '#fff7ee';
      c.lineWidth = 6;
      c.strokeText('♪', 32, 34);
      c.fillStyle = '#5d8fd6';
      c.fillText('♪', 32, 34);
    } else {
      const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 30);
      const core = kind === 'spark' ? '255, 196, 110' : '255, 244, 190';
      gradient.addColorStop(0, `rgba(${core}, 1)`);
      gradient.addColorStop(0.35, `rgba(${core}, 0.75)`);
      gradient.addColorStop(1, `rgba(${core}, 0)`);
      c.fillStyle = gradient;
      c.fillRect(0, 0, 64, 64);
      if (kind === 'sparkle') {
        c.fillStyle = '#fffdf2';
        c.beginPath();
        c.moveTo(32, 4);
        c.quadraticCurveTo(35, 29, 60, 32);
        c.quadraticCurveTo(35, 35, 32, 60);
        c.quadraticCurveTo(29, 35, 4, 32);
        c.quadraticCurveTo(29, 29, 32, 4);
        c.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function signTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#d9a46a';
    c.fillRect(0, 0, 256, 128);
    c.strokeStyle = 'rgba(120, 70, 30, 0.35)';
    c.lineWidth = 3;
    for (const y of [30, 66, 100]) {
      c.beginPath();
      c.moveTo(8, y);
      c.bezierCurveTo(80, y - 6, 170, y + 6, 248, y);
      c.stroke();
    }
    c.fillStyle = '#4a2f1b';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 40px Georgia, serif';
    c.fillText('Welcome!', 128, 46);
    c.font = 'bold italic 30px Georgia, serif';
    c.fillText("Vinay's Island", 128, 92);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
  shake: number;
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
  private readonly interactables = new Map<THREE.Object3D, { kind: Interaction; swayer?: Swayer }>();
  private readonly particles: Particle[] = [];
  private readonly puffs: Puff[] = [];
  private readonly emoteMaterials = new Map<Emote, THREE.SpriteMaterial>();
  private motes: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  private moteSeeds: Float32Array = new Float32Array(0);
  private fire: { outer: THREE.Mesh; inner: THREE.Mesh; light: THREE.PointLight; glow: THREE.Mesh } | null = null;

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
  private patTime = Infinity;
  private phaseTime = 0;
  private lastPhase: FishingPhase = 'idle';
  private stillTime = 0;
  private waveTime = Infinity;
  private humTimer = 1;
  private stepSide = 0;
  private lastAnchor = '';
  private signShake = 0;
  private interactions = 0;
  private fireBoost = 0;
  private sign: THREE.Object3D | null = null;
  private readonly burst: { object: THREE.Object3D; age: number; life: number; velocity: THREE.Vector3 }[] = [];

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
    const target = this.pick();
    if (target) {
      this.interact(target.kind, target.swayer);
      return;
    }
    const hit = this.raycaster.ray.intersectPlane(this.ground, new THREE.Vector3());
    if (hit && Math.hypot(hit.x, hit.z) < LAYOUT.islandRadius + 0.5) this.command({ type: 'tap', point: [hit.x, hit.z] });
  }

  /** Pat the penguin from the HTML controls, same as tapping it. */
  pat(): void {
    this.interact('pat');
  }

  private pick(): { kind: Interaction; swayer?: Swayer } | null {
    const roots = [...this.interactables.keys()];
    for (const hit of this.raycaster.intersectObjects(roots, true)) {
      for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
        const entry = this.interactables.get(object);
        if (entry) return entry;
      }
    }
    return null;
  }

  private interact(kind: Interaction, swayer?: Swayer): void {
    if (!this.penguin) return;
    const motion = this.reducedMotion ? 0 : 1;
    switch (kind) {
      case 'pat': {
        // A pat during a bite is the most natural way to reel in.
        if (this.state.fishing.kind === 'bite') {
          this.command({ type: 'action' });
          return;
        }
        this.patTime = 0;
        const [x, z] = this.state.position;
        if (motion)
          for (let i = 0; i < 4; i++) {
            const side = i % 2 ? 1 : -1;
            this.emote('heart', new THREE.Vector3(x + side * (0.45 + i * 0.06), 1.15 + i * 0.12, z + 0.2), i * 0.1);
          }
        break;
      }
      case 'tree':
        if (swayer && motion) {
          swayer.shake = 1;
          const top = swayer.object.getWorldPosition(new THREE.Vector3());
          this.burstLeaves(top);
        }
        break;
      case 'sign':
        this.signShake = motion;
        break;
      case 'fire': {
        this.fireBoost = motion;
        const [x, z] = LAYOUT.campfire.center;
        if (motion) for (let i = 0; i < 10; i++) this.emote('spark', new THREE.Vector3(x, 0.45, z), i * 0.03);
        break;
      }
    }
    this.interactions++;
    this.host.dataset.interaction = `${kind}:${this.interactions}`;
    this.options.onInteract?.(kind);
  }

  private emote(kind: Emote, at: THREE.Vector3, delay = 0): void {
    const particle = this.particles.find((p) => p.kind === null) ?? this.particles[0];
    if (!particle) return;
    let material = this.emoteMaterials.get(kind);
    if (!material) {
      const texture = emoteTexture(kind);
      this.disposables.add(texture);
      material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: kind === 'spark',
        blending: kind === 'spark' || kind === 'sparkle' ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.emoteMaterials.set(kind, material);
      this.disposables.add(material);
    }
    particle.sprite.material = material;
    particle.kind = kind;
    particle.age = -delay;
    particle.sprite.position.copy(at);
    particle.sprite.visible = false;
    const r = () => this.random() * 2 - 1;
    switch (kind) {
      case 'heart':
        particle.life = 1.4;
        particle.velocity.set(Math.sign(at.x - this.state.position[0]) * 0.22 + r() * 0.08, 0.7, 0);
        break;
      case 'note':
        particle.life = 2.2;
        particle.velocity.set(0.18 + r() * 0.08, 0.45, r() * 0.1);
        break;
      case 'sparkle':
        particle.life = 1.1;
        particle.velocity.set(r() * 0.9, 0.9 + this.random() * 0.8, r() * 0.9);
        break;
      case 'spark':
        particle.life = 0.9 + this.random() * 0.5;
        particle.velocity.set(r() * 0.5, 1.6 + this.random() * 1.4, r() * 0.5);
        break;
    }
  }

  private burstLeaves(top: THREE.Vector3): void {
    let count = 0;
    for (const leaf of this.burst) {
      if (leaf.age < leaf.life || count >= 10) continue;
      count++;
      leaf.age = 0;
      leaf.life = 1.4 + this.random() * 0.8;
      leaf.object.visible = true;
      leaf.object.position.set(top.x + (this.random() - 0.5) * 1.2, top.y + 0.6 + this.random() * 0.6, top.z + (this.random() - 0.5) * 1.2);
      leaf.velocity.set((this.random() - 0.5) * 1.4, 0.6 + this.random() * 0.8, (this.random() - 0.5) * 1.4);
    }
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
    this.scene.add(new THREE.HemisphereLight(0xffe9cc, 0x8a9a55, 1.5));
    const sun = new THREE.DirectionalLight(0xffe0b0, 2.45);
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
    const fill = new THREE.DirectionalLight(0xffb48c, 0.6);
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
      this.exposeAnchor();
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
      const swayer: Swayer = { object: part(object, 'Canopy'), offset: index * 1.7, shake: 0 };
      this.swayers.push(swayer);
      this.interactables.set(object, { kind: 'tree', swayer });
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
    const autumn = new THREE.MeshStandardMaterial({ color: 0xe8b24a, roughness: 0.8, side: THREE.DoubleSide });
    this.disposables.add(autumn);
    for (let i = 0; i < 14; i++) {
      const leaf = this.template(source, 'Leaf').clone();
      leaf.visible = false;
      leaf.scale.setScalar(2.8);
      leaf.traverse((child) => {
        if (child instanceof THREE.Mesh) child.material = i % 3 ? autumn : child.material;
      });
      this.burst.push({ object: leaf, age: 1, life: 0, velocity: new THREE.Vector3() });
      this.scene.add(leaf);
    }
    this.buildCamp();

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

  private buildCamp(): void {
    const flat = (color: number) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
      this.disposables.add(material);
      return material;
    };
    const [fx, fz] = LAYOUT.campfire.center;
    const camp = new THREE.Group();
    camp.position.set(fx, 0, fz);
    camp.scale.setScalar(1.25);

    const stone = new THREE.DodecahedronGeometry(0.12, 0);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rock = new THREE.Mesh(stone, flat(i % 2 ? 0xa59d90 : 0x8f897f));
      rock.position.set(Math.cos(a) * 0.4, 0.06, Math.sin(a) * 0.4);
      rock.scale.set(1, 0.7, 1);
      rock.rotation.set(a, a * 2, 0);
      camp.add(rock);
    }
    const logGeometry = new THREE.CylinderGeometry(0.055, 0.065, 0.6, 6);
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeometry, flat(0x5e3820));
      const a = (i / 4) * Math.PI * 2 + 0.4;
      log.position.set(Math.cos(a) * 0.12, 0.17, Math.sin(a) * 0.12);
      log.rotation.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05);
      camp.add(log);
    }
    const embers = new THREE.Mesh(new THREE.CircleGeometry(0.28, 9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc8502a }));
    embers.position.y = 0.015;
    camp.add(embers);

    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 7), new THREE.MeshBasicMaterial({ color: 0xff8a33, transparent: true, opacity: 0.94 }));
    outer.position.y = 0.5;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52, 7), new THREE.MeshBasicMaterial({ color: 0xffe28f }));
    inner.position.y = 0.38;
    camp.add(outer, inner);

    const glowTexture = emoteTexture('spark');
    this.disposables.add(glowTexture);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: glowTexture, color: 0xffa05a, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    glow.position.y = 0.025;
    camp.add(glow);

    const light = new THREE.PointLight(0xff8a45, 4, 5, 1.5);
    light.position.y = 0.7;
    camp.add(light);
    this.fire = { outer, inner, light, glow };

    const puffGeometry = new THREE.IcosahedronGeometry(0.1, 0);
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(puffGeometry, new THREE.MeshBasicMaterial({ color: 0xf6efe6, transparent: true, opacity: 0, depthWrite: false }));
      this.puffs.push({ mesh, offset: i / 5 });
      camp.add(mesh);
    }
    const fireHitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 8), new THREE.MeshBasicMaterial({ visible: false }));
    fireHitbox.position.y = 0.5;
    camp.add(fireHitbox);
    this.interactables.set(camp, { kind: 'fire' });
    this.shadowed(camp);
    outer.castShadow = inner.castShadow = glow.castShadow = false;
    this.scene.add(camp);

    const [lx, lz] = LAYOUT.logSeat.center;
    const cut = flat(0xe6be86);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.95, 8), [flat(0x8a5634), cut, cut]);
    seat.position.set(lx, 0.16, lz);
    seat.rotation.set(0, 0.55, Math.PI / 2);
    seat.castShadow = true;
    seat.receiveShadow = true;
    this.scene.add(seat);

    const [sx, sz] = LAYOUT.sign.center;
    const sign = new THREE.Group();
    sign.position.set(sx, 0, sz);
    sign.rotation.y = 0.2;
    sign.scale.setScalar(1.45);
    const wood = flat(0xb98252);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), wood);
    post.position.y = 0.36;
    const face = signTexture();
    this.disposables.add(face);
    const faceMaterial = new THREE.MeshStandardMaterial({ map: face, roughness: 0.9 });
    this.disposables.add(faceMaterial);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.37, 0.05), [wood, wood, wood, wood, faceMaterial, wood]);
    board.position.y = 0.66;
    sign.add(post, board);
    this.shadowed(sign);
    this.interactables.set(sign, { kind: 'sign' });
    this.sign = sign;
    this.scene.add(sign);

    // Warm drifting motes, like dust in late-afternoon light.
    const count = 34;
    const positions = new Float32Array(count * 3);
    this.moteSeeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2;
      const radius = Math.sqrt(this.random()) * (LAYOUT.islandRadius - 1);
      this.moteSeeds.set([Math.cos(a) * radius, 0.4 + this.random() * 2.2, Math.sin(a) * radius, this.random() * 10], i * 4);
      positions.set([this.moteSeeds[i * 4], this.moteSeeds[i * 4 + 1], this.moteSeeds[i * 4 + 2]], i * 3);
    }
    const moteGeometry = new THREE.BufferGeometry();
    moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const moteTexture = emoteTexture('sparkle');
    this.disposables.add(moteTexture);
    this.motes = new THREE.Points(
      moteGeometry,
      new THREE.PointsMaterial({ map: moteTexture, size: 0.26, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6a8 }),
    );
    this.motes.frustumCulled = false;
    this.scene.add(this.motes);

    for (let i = 0; i < 28; i++) {
      const sprite = new THREE.Sprite();
      sprite.visible = false;
      sprite.renderOrder = 5;
      this.particles.push({ sprite, kind: null, age: 0, life: 1, velocity: new THREE.Vector3() });
      this.scene.add(sprite);
    }
  }

  private buildPenguin(source: THREE.Object3D): void {
    const penguin = this.shadowed(source.getObjectByName('Penguin') ?? source);
    penguin.scale.setScalar(1.3);
    for (const name of ['Body', 'Head', 'Flipper_L', 'Flipper_R', 'Foot_L', 'Foot_R', 'Eye_L', 'Eye_R', 'Rod', 'RodTip', 'ScarfTail']) {
      this.parts[name] = part(penguin, name);
    }
    this.parts.Rod.visible = false;
    // A generous invisible hitbox so the penguin is easy to tap on a phone.
    const hitbox = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hitbox.position.y = 0.75;
    penguin.add(hitbox);
    this.interactables.set(penguin, { kind: 'pat' });
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
    this.lastAnchor = '';
    if (this.penguin) {
      this.exposeAnchor();
      this.renderer.render(this.scene, this.camera);
    }
  }

  private exposeLandmarks(width: number, height: number): void {
    const landmarks: [string, Vec2, number][] = [
      ['pond', LAYOUT.pond.center, 0],
      ['meadow', [-3.2, 4.6], 0],
      ['sign', LAYOUT.sign.center, 0.66],
      ['campfire', LAYOUT.campfire.center, 0.35],
    ];
    this.camera.updateMatrixWorld();
    for (const [name, [x, z], y] of landmarks) {
      const projected = new THREE.Vector3(x, y, z).project(this.camera);
      this.host.dataset[`${name}X`] = String(Math.round(((projected.x + 1) / 2) * width));
      this.host.dataset[`${name}Y`] = String(Math.round(((1 - projected.y) / 2) * height));
    }
  }

  /** Where the speech bubble and tests find the penguin on screen. */
  private exposeAnchor(): void {
    const [x, z] = this.state.position;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    // Lift the bubble clear of the "!" marker and the fish held up after a catch.
    const kind = this.state.fishing.kind;
    const head = new THREE.Vector3(x, kind === 'bite' || kind === 'caught' ? 2.6 : 1.85, z).project(this.camera);
    const body = new THREE.Vector3(x, 0.75, z).project(this.camera);
    const ax = Math.round(((head.x + 1) / 2) * width);
    const ay = Math.round(((1 - head.y) / 2) * height);
    const key = `${ax}|${ay}`;
    if (key === this.lastAnchor) return;
    this.lastAnchor = key;
    this.host.style.setProperty('--anchor-x', `${ax}px`);
    this.host.style.setProperty('--anchor-y', `${ay}px`);
    this.host.dataset.penguinX = String(Math.round(((body.x + 1) / 2) * width));
    this.host.dataset.penguinY = String(Math.round(((1 - body.y) / 2) * height));
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
    this.exposeAnchor();
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
      swayer.shake = Math.max(0, swayer.shake - dt * 1.4);
      const shake = swayer.shake * swayer.shake * Math.sin(t * 30) * 0.13;
      swayer.object.rotation.z = base + this.gust * 0.09 * Math.sin(t * 3 + swayer.offset * 0.3) + shake;
      swayer.object.rotation.x = Math.cos(t * 0.9 + swayer.offset) * 0.02 * motion + shake * 0.5;
    }

    for (const leaf of this.burst) {
      if (!leaf.object.visible) continue;
      leaf.age += dt;
      if (leaf.age >= leaf.life) {
        leaf.object.visible = false;
        continue;
      }
      leaf.velocity.y = Math.max(-0.55, leaf.velocity.y - dt * 2.2);
      leaf.velocity.x *= 1 - dt * 1.2;
      leaf.velocity.z *= 1 - dt * 1.2;
      leaf.object.position.addScaledVector(leaf.velocity, dt);
      leaf.object.position.x += Math.sin(t * 4 + leaf.life * 10) * dt * 0.6;
      leaf.object.rotation.set(t * 3 + leaf.life * 7, t * 2, Math.sin(t * 5 + leaf.life) * 1.2);
      if (leaf.object.position.y < 0.05) leaf.object.visible = false;
    }

    this.animateCamp(dt, motion);
    this.animateParticles(dt);

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

  private animateCamp(dt: number, motion: number): void {
    const t = this.time;
    this.fireBoost = Math.max(0, this.fireBoost - dt * 1.2);
    if (this.fire) {
      const flicker = (Math.sin(t * 13) * 0.07 + Math.sin(t * 7.3 + 1) * 0.06 + Math.sin(t * 23) * 0.03) * motion;
      const boost = 1 + this.fireBoost * 0.45;
      this.fire.outer.scale.set((1 - flicker * 0.5) * boost, (1 + flicker) * boost, (1 - flicker * 0.5) * boost);
      this.fire.outer.rotation.y = t * 0.8 * motion;
      this.fire.inner.scale.set(1, 1 + flicker * 1.4, 1);
      this.fire.inner.rotation.y = -t * 1.3 * motion;
      this.fire.light.intensity = (4 + flicker * 8) * (1 + this.fireBoost * 0.8);
      (this.fire.glow.material as THREE.MeshBasicMaterial).opacity = 0.45 + flicker * 0.6 + this.fireBoost * 0.25;
    }
    this.puffs.forEach(({ mesh, offset }) => {
      const u = (t * 0.22 * motion + offset) % 1;
      mesh.position.set(Math.sin(u * 5 + offset * 9) * 0.12 + u * 0.35, 0.65 + u * 1.7, -u * 0.15);
      mesh.scale.setScalar(0.6 + u * 1.6);
      mesh.rotation.set(u * 3, u * 2 + offset, 0);
      mesh.material.opacity = 0.42 * Math.min(1, u * 6) * (1 - u);
    });

    if (this.sign) {
      this.signShake = Math.max(0, this.signShake - dt * 1.5);
      this.sign.rotation.z = Math.sin(t * 22) * this.signShake * this.signShake * 0.12;
    }

    if (this.motes) {
      const positions = this.motes.geometry.attributes.position as THREE.BufferAttribute;
      const seeds = this.moteSeeds;
      const d = this.drift;
      for (let i = 0; i < positions.count; i++) {
        const o = seeds[i * 4 + 3];
        positions.setXYZ(
          i,
          seeds[i * 4] + Math.sin(d * 0.3 + o) * 0.6,
          seeds[i * 4 + 1] + Math.sin(d * 0.7 + o * 2) * 0.25,
          seeds[i * 4 + 2] + Math.cos(d * 0.25 + o) * 0.6,
        );
      }
      positions.needsUpdate = true;
      this.motes.material.opacity = 0.65 + Math.sin(d * 1.3) * 0.2;
    }
  }

  private animateParticles(dt: number): void {
    const t = this.time;
    for (const particle of this.particles) {
      if (particle.kind === null) continue;
      particle.age += dt;
      if (particle.age < 0) continue;
      const u = particle.age / particle.life;
      if (u >= 1) {
        particle.kind = null;
        particle.sprite.visible = false;
        continue;
      }
      const sprite = particle.sprite;
      sprite.visible = true;
      if (particle.kind === 'spark' || particle.kind === 'sparkle') particle.velocity.y -= dt * (particle.kind === 'spark' ? 2.2 : 1.6);
      sprite.position.addScaledVector(particle.velocity, dt);
      if (particle.kind === 'heart' || particle.kind === 'note') sprite.position.x += Math.sin(t * 5 + particle.life * 9) * dt * 0.25;
      const pop = Math.min(1, u * 6) * (1 - Math.pow(u, 3));
      const size = { heart: 0.38, note: 0.46, sparkle: 0.3, spark: 0.13 }[particle.kind];
      sprite.scale.setScalar(size * pop * (particle.kind === 'heart' ? 1 + Math.sin(u * 20) * 0.08 : 1));
      sprite.material.rotation = particle.kind === 'note' ? Math.sin(t * 4 + particle.life) * 0.3 : 0;
    }
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

    const side = Math.sign(w);
    if (this.walkBlend > 0.5 && side !== 0 && side !== this.stepSide) this.options.onStep?.(onDock(position) ? 'wood' : 'grass');
    this.stepSide = side;

    if (fishing.kind !== this.lastPhase) {
      this.lastPhase = fishing.kind;
      this.phaseTime = 0;
      if (fishing.kind === 'caught' && motion) {
        for (let i = 0; i < 9; i++) this.emote('sparkle', new THREE.Vector3(position[0], 1.9, position[1]), i * 0.03);
      }
    } else this.phaseTime += dt;
    this.patTime += dt;

    // Standing around: after a while the penguin looks up at you and waves.
    const resting = speed < 0.1 && fishing.kind === 'idle';
    this.stillTime = resting ? this.stillTime + dt : 0;
    this.waveTime += dt;
    if (!resting) this.waveTime = Infinity;
    else if (motion && this.stillTime > 5 && this.waveTime > 11) this.waveTime = 0;
    const waving = this.waveTime < 1.8 ? Math.sin(Math.PI * Math.min(1, this.waveTime / 1.8)) : 0;
    const look = resting && this.stillTime > 1.2 ? Math.min(1, (this.stillTime - 1.2) * 2) : 0;

    if (fishing.kind === 'waiting' && motion) {
      this.humTimer -= dt;
      if (this.humTimer <= 0) {
        this.humTimer = 1.5 + this.random() * 0.8;
        this.emote('note', new THREE.Vector3(position[0] + 0.25, 1.75, position[1] + 0.2));
      }
    } else this.humTimer = 0.6;

    // Happy hops: two for a pat, a bigger pair for a catch.
    const hop = (time: number, length: number, height: number) =>
      time < length * 2 ? Math.abs(Math.sin((Math.PI * time) / length)) * height * (time < length ? 1 : 0.55) : 0;
    const joy = (hop(this.patTime, 0.32, 0.26) + (fishing.kind === 'caught' ? hop(this.phaseTime, 0.38, 0.34) : 0)) * motion;
    const patted = this.patTime < 1.2;
    const beaming = patted || (fishing.kind === 'caught' && this.phaseTime < 1.4);

    penguin.position.set(position[0], Math.abs(w) * 0.07 * this.walkBlend + joy, position[1]);
    penguin.rotation.y = facing;
    const body = this.parts.Body;
    body.rotation.z = w * 0.13 * this.walkBlend + (patted ? Math.sin(this.patTime * 14) * 0.08 * (1 - this.patTime / 1.2) * motion : 0);
    body.scale.y = 1 + idle * 0.015 * (1 - this.walkBlend) + (patted && this.patTime < 0.12 ? -0.08 * motion : 0);
    const towardCamera = Math.atan2(Math.sin(-facing), Math.cos(-facing));
    this.parts.Head.rotation.y = THREE.MathUtils.clamp(towardCamera, -0.9, 0.9) * look * motion;
    this.parts.Head.rotation.z =
      -w * 0.06 * this.walkBlend +
      Math.sin(t * 0.7) * 0.04 * motion +
      (fishing.kind === 'waiting' ? Math.sin(t * 2.6) * 0.07 * motion : 0) +
      (patted ? 0.18 * Math.sin(Math.PI * Math.min(1, this.patTime / 1.2)) * motion : 0) +
      waving * 0.12;
    this.parts.Foot_L.rotation.x = w * 0.6 * this.walkBlend;
    this.parts.Foot_R.rotation.x = -w * 0.6 * this.walkBlend;
    this.parts.ScarfTail.rotation.x = 0.1 + Math.sin(t * 3) * 0.12 * motion + this.gust * 0.5 + this.walkBlend * 0.25;

    const blink = beaming && motion ? 0.2 : motion && t % 4.3 < 0.12 ? 0.15 : 1;
    this.parts.Eye_L.scale.y = blink;
    this.parts.Eye_R.scale.y = blink;

    let rightFlipper = -(0.25 + Math.abs(w) * 0.35 * this.walkBlend + idle * 0.04);
    const flap = patted ? Math.abs(Math.sin(this.patTime * 16)) * 0.5 * (1 - this.patTime / 1.2) * motion : 0;
    rightFlipper -= flap;
    const leftFlipper = 0.25 + Math.abs(w) * 0.35 * this.walkBlend + idle * 0.04 + flap + (waving > 0 ? waving * (1.5 + Math.sin(this.waveTime * 14) * 0.35) : 0);
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
