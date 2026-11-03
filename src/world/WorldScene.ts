import * as THREE from 'three';
import { CollisionSystem } from './CollisionSystem';
import { TeaStallBuilder, type StoolSpot } from './TeaStallBuilder';
import { buildTeaVendorNPC, type TeaVendorRig } from '../npc/TeaVendorNPC';
import { buildThayDoNPC, type ThayDoRig } from '../npc/ThayDoNPC';
import { DogCompanion } from './DogCompanion';
import { StreetDramaSystem } from './StreetDramaSystem';
import { TrafficSystem } from './TrafficSystem';
import { buildChibiAvatar, type AvatarRig } from '../player/AvatarBuilder';
import type { PlayerData, PlayerRole } from '../types/game';

export interface RemotePlayerRig {
  data: PlayerData;
  rig: AvatarRig;
  targetPos: THREE.Vector3;
  targetRotY: number;
}

export class WorldScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public collisionSystem: CollisionSystem;
  public stallBuilder: TeaStallBuilder;
  public npc: TeaVendorRig;
  public thayDo: ThayDoRig;
  public dog: DogCompanion;
  public streetDrama: StreetDramaSystem;
  public trafficSystem: TrafficSystem;

  private container: HTMLElement;
  private animFrameId: number | null = null;
  private prevTime = performance.now();

  // Atmospheric particle systems
  private particleGroup = new THREE.Group();
  private dustPoints!: THREE.Points;
  private leavesGroup = new THREE.Group();

  // Remote players in multiplayer
  private remotePlayers = new Map<string, RemotePlayerRig>();

  // Custom onUpdate hook
  public onUpdate?: (delta: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6d5a8); // Warm afternoon golden sky
    this.scene.fog = new THREE.FogExp2(0xf6d5a8, 0.022);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 5, 10);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting (Warm afternoon golden light)
    this.setupLighting();

    // 5. Collision System & Tea Stall Environment
    this.collisionSystem = new CollisionSystem();
    this.stallBuilder = new TeaStallBuilder(this.scene, this.collisionSystem);
    this.stallBuilder.buildAll();

    // 6. NPC: Trà Đá Thị Trường
    this.npc = buildTeaVendorNPC();
    this.scene.add(this.npc.group);
    this.collisionSystem.addCylinder(-1.8, -1.2, 0.8);

    // 7. NPC: Thầy Đồ Xóc Đĩa
    this.thayDo = buildThayDoNPC();
    this.scene.add(this.thayDo.group);
    this.collisionSystem.addCylinder(4.2, 1.8, 0.9);

    // 8. Dog Companion (Cậu Vàng)
    this.dog = new DogCompanion(this.scene, new THREE.Vector3(-4.2, 0, 0.8));
    this.collisionSystem.addCylinder(-4.2, 0.8, 0.6);

    // 9. Street Drama System (2 thanh niên chửi nhau ngẫu nhiên trên phố)
    this.streetDrama = new StreetDramaSystem(this.scene);

    // 10. Street Traffic System (Motorbikes & Cars)
    this.trafficSystem = new TrafficSystem(this.scene);

    // 11. Ambient particles (Fireflies & Autumn leaves)
    this.setupParticles();

    // 8. Event listeners
    window.addEventListener('resize', this.onWindowResize);

    // 9. Start render loop
    this.animate();
  }

  private setupLighting() {
    // Warm ambient light
    const ambientLight = new THREE.AmbientLight(0xffecd2, 0.7);
    this.scene.add(ambientLight);

    // Afternoon directional sun
    const sunLight = new THREE.DirectionalLight(0xffe29a, 1.8);
    sunLight.position.set(12, 16, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    sunLight.shadow.bias = -0.001;
    this.scene.add(sunLight);

    // Lantern point light
    const lanternLight = new THREE.PointLight(0xff6b35, 1.4, 8);
    lanternLight.position.set(0, 3.8, -4.2);
    this.scene.add(lanternLight);

    // Sky hemisphere
    const hemiLight = new THREE.HemisphereLight(0xffe8cf, 0x8a6245, 0.4);
    this.scene.add(hemiLight);
  }

  private setupParticles() {
    // Golden floating dust motes / fireflies
    const dustCount = 100;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 30;
      dustPositions[i * 3 + 1] = 0.5 + Math.random() * 6;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0xffd27d,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.particleGroup.add(this.dustPoints);

    // Falling leaves
    const leafMat = new THREE.MeshBasicMaterial({ color: 0xd47a37, side: THREE.DoubleSide });
    const leafGeo = new THREE.PlaneGeometry(0.12, 0.08);

    for (let i = 0; i < 25; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(
        (Math.random() - 0.5) * 12 + 3.5,
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 12 - 3.5
      );
      leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.leavesGroup.add(leaf);
    }
    this.particleGroup.add(this.leavesGroup);

    this.scene.add(this.particleGroup);
  }

  // --- Remote Player Management ---
  public addRemotePlayer(player: PlayerData) {
    if (this.remotePlayers.has(player.id)) return;

    const rig = buildChibiAvatar(player.avatar, player.nickname, player.role);
    rig.root.position.set(player.position.x, player.position.y, player.position.z);
    rig.root.rotation.y = player.rotationY;
    this.scene.add(rig.root);

    this.remotePlayers.set(player.id, {
      data: player,
      rig,
      targetPos: new THREE.Vector3(player.position.x, player.position.y, player.position.z),
      targetRotY: player.rotationY,
    });
  }

  public updateRemotePlayerMove(
    id: string,
    pos: { x: number; y: number; z: number },
    rotY: number,
    isMoving: boolean,
    isRunning: boolean,
    isSitting?: boolean
  ) {
    const remote = this.remotePlayers.get(id);
    if (!remote) return;

    remote.targetPos.set(pos.x, pos.y, pos.z);
    remote.targetRotY = rotY;
    remote.data.isMoving = isMoving;
    remote.data.isRunning = isRunning;
    if (isSitting !== undefined) {
      remote.data.isSitting = isSitting;
    }
  }

  public updateRemotePlayerEmote(id: string, emote: string) {
    const remote = this.remotePlayers.get(id);
    if (!remote) return;
    remote.data.currentEmote = emote;
  }

  public removeRemotePlayer(id: string) {
    const remote = this.remotePlayers.get(id);
    if (!remote) return;

    this.scene.remove(remote.rig.root);
    this.remotePlayers.delete(id);
  }

  public clearAllRemotePlayers() {
    for (const remote of this.remotePlayers.values()) {
      this.scene.remove(remote.rig.root);
    }
    this.remotePlayers.clear();
  }

  // --- Main Animation Loop ---
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min(0.1, (now - this.prevTime) / 1000);
    this.prevTime = now;
    const timeSec = now / 1000;

    // 1. External hook (PlayerController update)
    this.onUpdate?.(delta);

    // 2. Interpolate remote players (Dead Reckoning & Lerp)
    this.remotePlayers.forEach((remote) => {
      remote.rig.root.position.lerp(remote.targetPos, Math.min(1.0, delta * 10));

      let diff = remote.targetRotY - remote.rig.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      remote.rig.root.rotation.y += diff * Math.min(1.0, delta * 10);

      remote.rig.updateAnimation(
        timeSec,
        remote.data.isMoving,
        remote.data.isRunning,
        remote.data.isSitting,
        remote.data.currentEmote
      );
    });

    // 3. Update Street Traffic (Motorbikes & Cars), Dog & Street Drama
    this.trafficSystem.update(delta);
    this.dog.update(timeSec, this.camera.position);
    this.streetDrama.update(delta, timeSec);

    // 4. Update Tiệm Vàng DJN Gold Billboard (Realtime tick & candlestick updates)
    if (this.stallBuilder.goldBillboard) {
      this.stallBuilder.goldBillboard.update(timeSec, delta);
    }

    // 5. Animate particles
    if (this.dustPoints) {
      const posAttr = this.dustPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) + Math.sin(timeSec + i) * 0.003;
        if (y > 6.5) y = 0.5;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    this.leavesGroup.children.forEach((leaf, idx) => {
      leaf.position.y -= delta * (0.6 + (idx % 4) * 0.15);
      leaf.position.x += Math.sin(timeSec + idx) * delta * 0.4;
      leaf.rotation.x += delta * 1.5;
      leaf.rotation.y += delta * 1.0;
      if (leaf.position.y < 0.05) {
        leaf.position.y = 5 + Math.random() * 2;
        leaf.position.x = (Math.random() - 0.5) * 10 + 3.5;
      }
    });

    // 4. Render frame
    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public updateGoldPrice(
    price: number,
    change?: number,
    changePercent?: number,
    candles?: { o: number; h: number; l: number; c: number }[]
  ) {
    this.stallBuilder.goldBillboard?.updatePrice(price, change, changePercent, candles);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.trafficSystem.dispose();
    this.streetDrama.dispose();
    this.clearAllRemotePlayers();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

