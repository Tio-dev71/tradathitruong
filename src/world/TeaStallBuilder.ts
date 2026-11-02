import * as THREE from 'three';
import type { CollisionSystem } from './CollisionSystem';
import { GoldBillboardSystem } from './GoldBillboardSystem';

export interface StoolSpot {
  x: number;
  z: number;
  facingY: number; // angle in radians facing towards table
}

export class TeaStallBuilder {
  private scene: THREE.Scene;
  private collisionSystem: CollisionSystem;
  public stoolSpots: StoolSpot[] = [];
  public goldBillboard!: GoldBillboardSystem;

  constructor(scene: THREE.Scene, collisionSystem: CollisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
  }

  public buildAll() {
    this.buildGround();
    this.buildWelcomeArch();
    this.buildBanyanTree();
    this.buildColonialWall();
    this.buildTeaTableAndProps();
    this.buildPlasticStools();
    this.buildSignboard();
    this.buildBlackboard();
    this.buildPowerPolesAndWires();
    this.buildAcrossStreetBuildings();
    this.buildVillageSurroundings();
  }

  // 1. Sidewalk pavement, curb & Asphalt Street with crosswalk
  private buildGround() {
    // Generate procedural tile texture for authentic sidewalk look
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#b35d43'; // Terracotta sidewalk tile color
      ctx.fillRect(0, 0, 512, 512);

      // Draw traditional Vietnamese circular pattern sidewalk tiles
      ctx.strokeStyle = '#8f412b';
      ctx.lineWidth = 4;
      const tileSize = 64;
      for (let x = 0; x < 512; x += tileSize) {
        for (let y = 0; y < 512; y += tileSize) {
          ctx.strokeRect(x, y, tileSize, tileSize);
          ctx.beginPath();
          ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    const tileTexture = new THREE.CanvasTexture(canvas);
    tileTexture.wrapS = THREE.RepeatWrapping;
    tileTexture.wrapT = THREE.RepeatWrapping;
    tileTexture.repeat.set(16, 16);

    const groundGeo = new THREE.PlaneGeometry(70, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tileTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, 0, 0);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Asphalt Road (Mặt đường nhựa)
    const roadGeo = new THREE.PlaneGeometry(80, 20);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b, // Dark asphalt
      roughness: 0.85,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.02, 16);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // White painted pedestrian crosswalk (Vạch kẻ đường sang phố)
    const zebraGroup = new THREE.Group();
    zebraGroup.position.set(-6, 0.03, 16);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
    for (let i = 0; i < 7; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 12), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i * 1.8, 0, 0);
      stripe.receiveShadow = true;
      zebraGroup.add(stripe);
    }
    this.scene.add(zebraGroup);

    // Curb edge separating sidewalk from road
    const curbGeo = new THREE.BoxGeometry(70, 0.28, 0.6);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x8e8e8e, roughness: 0.7 });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(0, 0.14, 8);
    curb.castShadow = true;
    curb.receiveShadow = true;
    this.scene.add(curb);
  }

  // 2. Large Banyan Tree (Cây Đa Cổ Thụ)
  private buildBanyanTree() {
    const treeGroup = new THREE.Group();
    const treeX = 3.5;
    const treeZ = -3.5;
    treeGroup.position.set(treeX, 0, treeZ);

    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3220,
      roughness: 0.9,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2e6629,
      roughness: 0.7,
      flatShading: true,
    });
    const leafHighlightMat = new THREE.MeshStandardMaterial({
      color: 0x488a38,
      roughness: 0.65,
      flatShading: true,
    });

    // Main gnarly trunk
    const trunkGeo = new THREE.CylinderGeometry(1.4, 2.2, 7, 10);
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    this.collisionSystem.addCylinder(treeX, treeZ, 2.4);

    // Hanging aerial roots
    const aerialRootPositions = [
      { x: -2.2, z: 1.2, r: 0.25 },
      { x: 2.1, z: -1.5, r: 0.3 },
      { x: -1.8, z: -2.0, r: 0.2 },
      { x: 1.5, z: 2.2, r: 0.22 },
    ];
    aerialRootPositions.forEach((root) => {
      const rootGeo = new THREE.CylinderGeometry(root.r, root.r * 1.3, 6, 6);
      const rootMesh = new THREE.Mesh(rootGeo, barkMat);
      rootMesh.position.set(root.x, 3, root.z);
      rootMesh.rotation.z = (Math.random() - 0.5) * 0.15;
      rootMesh.castShadow = true;
      treeGroup.add(rootMesh);
      this.collisionSystem.addCylinder(treeX + root.x, treeZ + root.z, root.r * 1.5);
    });

    // Sprawling canopy branches & foliage clusters
    const branchCoords = [
      { x: -3.5, y: 6.8, z: 0, s: 3.2, mat: leafMat },
      { x: 3.2, y: 7.2, z: -1.5, s: 3.6, mat: leafHighlightMat },
      { x: 0, y: 8.5, z: 0, s: 4.2, mat: leafMat },
      { x: -2.0, y: 7.5, z: 2.8, s: 3.4, mat: leafHighlightMat },
      { x: 2.5, y: 6.5, z: 2.5, s: 3.0, mat: leafMat },
      { x: -1.0, y: 6.2, z: -3.5, s: 3.1, mat: leafHighlightMat },
    ];

    branchCoords.forEach((b) => {
      const foliageGeo = new THREE.DodecahedronGeometry(b.s, 1);
      const foliage = new THREE.Mesh(foliageGeo, b.mat);
      foliage.position.set(b.x, b.y, b.z);
      foliage.castShadow = true;
      treeGroup.add(foliage);
    });

    this.scene.add(treeGroup);
  }

  // 3. Colonial Yellow Wall with Stencils
  private buildColonialWall() {
    const wallGroup = new THREE.Group();
    wallGroup.position.set(0, 0, -8);

    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 1024;
    wallCanvas.height = 512;
    const ctx = wallCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#dfaa46';
      ctx.fillRect(0, 0, 1024, 512);

      ctx.fillStyle = '#a67d32';
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 512, 40 + Math.random() * 60, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#4f5e3b';
      ctx.fillRect(0, 420, 1024, 92);

      ctx.fillStyle = '#1c2833';
      ctx.font = 'bold 32px monospace';
      ctx.fillText('KH.CẮT BÊ TÔNG', 120, 140);
      ctx.font = 'bold 40px monospace';
      ctx.fillText('0912.289.306', 130, 190);

      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('HÚT BỂ PHỐT 0988.123.456', 620, 220);
    }

    const wallTex = new THREE.CanvasTexture(wallCanvas);
    const wallGeo = new THREE.BoxGeometry(28, 6.5, 0.6);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.9,
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = 3.25;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallGroup.add(wallMesh);

    const roofGeo = new THREE.BoxGeometry(26, 0.1, 4.5);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x6e4a3b,
      roughness: 0.8,
      metalness: 0.3,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 5.5, 2.0);
    roof.rotation.x = 0.2;
    roof.castShadow = true;
    wallGroup.add(roof);

    this.collisionSystem.addBox(-14, -8.6, 14, -7.4);
    this.scene.add(wallGroup);
  }

  // 4. Main Tea Stall Table & Props
  private buildTeaTableAndProps() {
    const stallGroup = new THREE.Group();
    const stallX = 0;
    const stallZ = -1.5;
    stallGroup.position.set(stallX, 0, stallZ);

    const tableTopGeo = new THREE.BoxGeometry(3.2, 0.12, 1.6);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x543821, roughness: 0.75 });
    const tableTop = new THREE.Mesh(tableTopGeo, woodMat);
    tableTop.position.y = 0.8;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    stallGroup.add(tableTop);

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6);
    const legOffsets = [
      { x: -1.4, z: -0.65 },
      { x: 1.4, z: -0.65 },
      { x: -1.4, z: 0.65 },
      { x: 1.4, z: 0.65 },
    ];
    legOffsets.forEach((o) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(o.x, 0.4, o.z);
      leg.castShadow = true;
      stallGroup.add(leg);
    });

    this.collisionSystem.addBox(stallX - 1.8, stallZ - 1.0, stallX + 1.8, stallZ + 1.0);

    // Straw-insulated tea basket with blue teapot (Ấm tích ủ rơm)
    const strawBasketGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.45, 12);
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.95 });
    const strawBasket = new THREE.Mesh(strawBasketGeo, strawMat);
    strawBasket.position.set(-0.8, 1.08, 0.1);
    strawBasket.castShadow = true;
    stallGroup.add(strawBasket);

    const teapotGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.25, 10);
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x1f4e78, roughness: 0.2, metalness: 0.1 });
    const teapot = new THREE.Mesh(teapotGeo, ceramicMat);
    teapot.position.set(-0.8, 1.35, 0.1);
    teapot.castShadow = true;
    stallGroup.add(teapot);

    // Red Rạng Đông Thermos (Phích nước)
    const thermosBodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, 12);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xbf1515, roughness: 0.4, metalness: 0.1 });
    const thermos = new THREE.Mesh(thermosBodyGeo, redMat);
    thermos.position.set(-1.2, 1.18, -0.2);
    thermos.castShadow = true;
    stallGroup.add(thermos);

    const thermosCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.15, 10),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.3 })
    );
    thermosCap.position.set(-1.2, 1.55, -0.2);
    stallGroup.add(thermosCap);

    // Teacups
    const cupGeo = new THREE.CylinderGeometry(0.09, 0.06, 0.12, 8);
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const teaLiquidMat = new THREE.MeshStandardMaterial({ color: 0xb58c1b, roughness: 0.1 });

    const cupPositions = [
      { x: 0.2, z: 0.2 },
      { x: 0.5, z: 0.15 },
      { x: 0.3, z: -0.3 },
    ];
    cupPositions.forEach((cp) => {
      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.position.set(cp.x, 0.92, cp.z);
      cup.castShadow = true;
      stallGroup.add(cup);

      const teaLiquid = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), teaLiquidMat);
      teaLiquid.rotation.x = -Math.PI / 2;
      teaLiquid.position.set(cp.x, 0.97, cp.z);
      stallGroup.add(teaLiquid);
    });

    // Plate of sunflower seeds & Peanut basket
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    plate.position.set(0.8, 0.88, 0.1);
    stallGroup.add(plate);

    const seeds = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.03, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    seeds.position.set(0.8, 0.91, 0.1);
    stallGroup.add(seeds);

    const peanutBasket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.2, 0.1, 10),
      new THREE.MeshStandardMaterial({ color: 0xc49a45, roughness: 0.9 })
    );
    peanutBasket.position.set(0.9, 0.91, -0.35);
    stallGroup.add(peanutBasket);

    // Bamboo water pipe (Điếu cày nứa)
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: 0xa87e3b, roughness: 0.5 })
    );
    pipe.position.set(1.5, 0.5, 0.6);
    pipe.rotation.z = 0.4;
    pipe.rotation.x = 0.3;
    pipe.castShadow = true;
    stallGroup.add(pipe);

    this.scene.add(stallGroup);
  }

  // 5. Plastic Stools with exact Snap coordinates (Ghế nhựa lùn Song Long / Đại Đồng Tiến)
  private buildPlasticStools() {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdf2828, roughness: 0.5 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d70b8, roughness: 0.5 });

    const createStool = (x: number, z: number, colorMat: THREE.Material, facingY: number) => {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(x, 0, z);

      // Seat top (Height = 0.40, dimensions 0.34 x 0.05 x 0.34 prevents clipping through chibi characters)
      const seatGeo = new THREE.BoxGeometry(0.34, 0.05, 0.34);
      const seat = new THREE.Mesh(seatGeo, colorMat);
      seat.position.y = 0.40;
      seat.castShadow = true;
      stoolGroup.add(seat);

      // 4 tapered plastic legs
      const legGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.40, 6);
      const legOffsets = [
        { x: -0.12, z: -0.12 },
        { x: 0.12, z: -0.12 },
        { x: -0.12, z: 0.12 },
        { x: 0.12, z: 0.12 },
      ];
      legOffsets.forEach((lo) => {
        const leg = new THREE.Mesh(legGeo, colorMat);
        leg.position.set(lo.x, 0.20, lo.z);
        leg.castShadow = true;
        stoolGroup.add(leg);
      });

      this.scene.add(stoolGroup);
      this.stoolSpots.push({ x, z, facingY });
    };

    // Stool positions facing towards the tea table (table is at 0, -1.5)
    createStool(-1.2, 0.4, redMat, Math.PI); // Facing north towards table
    createStool(-0.4, 0.5, blueMat, Math.PI);
    createStool(0.4, 0.5, redMat, Math.PI);
    createStool(1.2, 0.4, blueMat, Math.PI);
    createStool(-2.3, -1.2, redMat, Math.PI / 2); // Facing east
    createStool(2.3, -1.2, blueMat, -Math.PI / 2); // Facing west
    createStool(-1.8, 2.4, blueMat, Math.PI);
    createStool(1.8, 2.4, redMat, Math.PI);
  }

  // 6. Concrete Power Poles with Tangled Wires (Cột điện dây điện chằng chịt)
  private buildPowerPolesAndWires() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.8 });
    const crossBarMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.6 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });

    const polePositions = [
      { x: -16, z: 8.5 },
      { x: 16, z: 8.5 },
      { x: -18, z: 23 },
      { x: 18, z: 23 },
    ];

    polePositions.forEach((pos) => {
      const poleGroup = new THREE.Group();
      poleGroup.position.set(pos.x, 0, pos.z);

      // Centrifugal concrete pole (Cột điện bê tông li tâm)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 9, 10), poleMat);
      pole.position.y = 4.5;
      pole.castShadow = true;
      poleGroup.add(pole);

      // Steel Cross Arms (Xà đỡ sứ)
      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), crossBarMat);
      arm1.position.y = 8.2;
      poleGroup.add(arm1);

      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), crossBarMat);
      arm2.position.y = 7.6;
      poleGroup.add(arm2);

      // Street Lamp attached to pole
      const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), crossBarMat);
      lampArm.position.set(0.6, 7.8, 0);
      lampArm.rotation.z = -0.5;
      poleGroup.add(lampArm);

      const lampHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xfffae6, emissive: 0xffe082, emissiveIntensity: 0.9 })
      );
      lampHead.position.set(1.4, 8.2, 0);
      poleGroup.add(lampHead);

      const streetLight = new THREE.PointLight(0xffdf80, 1.2, 14);
      streetLight.position.set(1.4, 8.0, 0);
      poleGroup.add(streetLight);

      // Tangled Cable box / Transformer drum (Hộp điện / biến áp)
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.4), crossBarMat);
      box.position.set(0, 4.2, 0.25);
      poleGroup.add(box);

      this.scene.add(poleGroup);
      this.collisionSystem.addCylinder(pos.x, pos.z, 0.6);
    });

    // String hanging electrical wires between poles
    const wirePoints = [
      new THREE.Vector3(-16, 8.2, 8.5),
      new THREE.Vector3(0, 7.2, 8.5), // slight sag in middle
      new THREE.Vector3(16, 8.2, 8.5),
    ];
    const curve = new THREE.CatmullRomCurve3(wirePoints);
    const wireGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    const wireLine = new THREE.Line(wireGeo, wireMat);
    this.scene.add(wireLine);

    // Cross-street wire
    const crossWirePoints = [
      new THREE.Vector3(-16, 8.2, 8.5),
      new THREE.Vector3(-17, 7.5, 16),
      new THREE.Vector3(-18, 8.2, 23),
    ];
    const crossCurve = new THREE.CatmullRomCurve3(crossWirePoints);
    const crossWireLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(crossCurve.getPoints(20)), wireMat);
    this.scene.add(crossWireLine);
  }

  // 1b. Traditional Vietnamese Welcome Arch (Cổng Chào Khu Phố Văn Hóa / Quán Trà Đá)
  private buildWelcomeArch() {
    const archGroup = new THREE.Group();
    const archX = -15.0;
    archGroup.position.set(archX, 0, 0);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8b1e1e, roughness: 0.65 });
    const stoneBaseMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
    const roofTileMat = new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.7 });

    const pillarZ1 = 1.0;
    const pillarZ2 = 7.0;
    const pillarHeight = 5.2;

    // Two main gate pillars (Cột cổng chào)
    [pillarZ1, pillarZ2].forEach((pz) => {
      // Stone base
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), stoneBaseMat);
      base.position.set(0, 0.3, pz);
      base.castShadow = true;
      base.receiveShadow = true;
      archGroup.add(base);

      // Red brick pillar body
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, pillarHeight - 0.6, 0.65), pillarMat);
      pillar.position.set(0, (pillarHeight + 0.6) / 2, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      archGroup.add(pillar);

      // Gold capital trim on top of pillar
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), goldTrimMat);
      cap.position.set(0, pillarHeight + 0.1, pz);
      archGroup.add(cap);

      // Add collision so player does not walk through the gate pillars
      this.collisionSystem.addBox(archX - 0.45, pz - 0.45, archX + 0.45, pz + 0.45);
    });

    // Horizontal Lintel Beam (Xà ngang cổng)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, pillarZ2 - pillarZ1 + 1.2), pillarMat);
    beam.position.set(0, pillarHeight + 0.35, (pillarZ1 + pillarZ2) / 2);
    beam.castShadow = true;
    archGroup.add(beam);

    // Curved Traditional Vietnamese Roof (Mái ngói cong đình làng)
    const roofSpan = pillarZ2 - pillarZ1 + 2.2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, roofSpan), roofTileMat);
    roof.position.set(0, pillarHeight + 0.75, (pillarZ1 + pillarZ2) / 2);
    roof.castShadow = true;
    archGroup.add(roof);

    // Roof upper tier
    const topRoof = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, roofSpan - 0.8), roofTileMat);
    topRoof.position.set(0, pillarHeight + 1.02, (pillarZ1 + pillarZ2) / 2);
    archGroup.add(topRoof);

    // Golden ridge ornament (Kìm nóc / Lưỡng long chầu nguyệt placeholder)
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), goldTrimMat);
    crest.position.set(0, pillarHeight + 1.35, (pillarZ1 + pillarZ2) / 2);
    archGroup.add(crest);

    // Welcome Signboard (Biển Cổng Chào)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Lacquer red background
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 10;
      ctx.strokeRect(12, 12, 1000, 232);

      // Inner ornate border
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, 976, 208);

      // Text lines
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 26px serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ KHU PHỐ VĂN HÓA TRUYỀN THỐNG ★', 512, 65);

      ctx.fillStyle = '#ffd700';
      ctx.font = '900 60px serif';
      ctx.fillText('QUÁN TRÀ ĐÁ THỊ TRƯỜNG', 512, 142);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('CHÚC QUÝ KHÁCH VÀO BẮT ĐÁY - RA ĐỈNH • MÃ ĐÁO THÀNH CÔNG', 512, 202);
    }

    const signTex = new THREE.CanvasTexture(canvas);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.25, 4.4),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
    );
    signBoard.position.set(0, pillarHeight - 0.55, (pillarZ1 + pillarZ2) / 2);
    signBoard.castShadow = true;
    archGroup.add(signBoard);

    // 2 Festive Red Lanterns hanging from eaves
    [pillarZ1 + 0.4, pillarZ2 - 0.4].forEach((lz) => {
      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0xff2222,
        emissive: 0xff3300,
        emissiveIntensity: 0.8,
        roughness: 0.4,
      });
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), lanternMat);
      lantern.scale.set(1, 1.3, 1);
      lantern.position.set(0, pillarHeight - 0.4, lz);
      archGroup.add(lantern);

      const light = new THREE.PointLight(0xff7733, 1.0, 6);
      light.position.set(0, pillarHeight - 0.6, lz);
      archGroup.add(light);
    });

    this.scene.add(archGroup);
  }

  // 7. Across-The-Street Storefronts & TIỆM VÀNG DJN with Live Gold Billboard
  private buildAcrossStreetBuildings() {
    const townGroup = new THREE.Group();
    townGroup.position.set(0, 0, 24);

    const colors = [0xd6a858, 0x5b8a99, 0xcc845b, 0xa3a375, 0xd4b077];
    const buildingWidth = 7.0;

    for (let i = -3; i <= 3; i++) {
      if (i === 0) {
        // --- FLAGSHIP: TIỆM VÀNG DJN ---
        const djnHeight = 13.5;
        const djnWidth = 8.2;
        const djnMat = new THREE.MeshStandardMaterial({
          color: 0x661010, // Royal Burgundy & Gold Luxury Theme
          roughness: 0.7,
        });

        // Main building block
        const djnMesh = new THREE.Mesh(new THREE.BoxGeometry(djnWidth, djnHeight, 8), djnMat);
        djnMesh.position.set(0, djnHeight / 2, 0);
        djnMesh.castShadow = true;
        djnMesh.receiveShadow = true;
        townGroup.add(djnMesh);

        // Gold Trim Cornices on Building Top and Middle
        const goldTrimMat = new THREE.MeshStandardMaterial({
          color: 0xd4af37,
          metalness: 0.8,
          roughness: 0.25,
        });
        const topRoofCornice = new THREE.Mesh(new THREE.BoxGeometry(djnWidth + 0.4, 0.4, 8.4), goldTrimMat);
        topRoofCornice.position.set(0, djnHeight, 0);
        townGroup.add(topRoofCornice);

        const midCornice = new THREE.Mesh(new THREE.BoxGeometry(djnWidth + 0.3, 0.3, 8.3), goldTrimMat);
        midCornice.position.set(0, 4.8, 0);
        townGroup.add(midCornice);

        // Ground Floor Gold Shop Glass Entrance & Pillars
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x223344,
          roughness: 0.1,
          metalness: 0.6,
        });
        const glassDoor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.1), glassMat);
        glassDoor.position.set(0, 1.6, -4.05);
        townGroup.add(glassDoor);

        // Two Golden Pillars at entrance
        [-2.3, 2.3].forEach((px) => {
          const goldPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 4.4, 12), goldTrimMat);
          goldPillar.position.set(px, 2.2, -4.1);
          goldPillar.castShadow = true;
          townGroup.add(goldPillar);
        });

        // Main Storefront Signboard: "TIỆM VÀNG DJN"
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 1024;
        signCanvas.height = 256;
        const sCtx = signCanvas.getContext('2d');
        if (sCtx) {
          sCtx.fillStyle = '#4a0e0e';
          sCtx.fillRect(0, 0, 1024, 256);
          sCtx.strokeStyle = '#ffd700';
          sCtx.lineWidth = 12;
          sCtx.strokeRect(10, 10, 1004, 236);

          sCtx.fillStyle = '#ffd700';
          sCtx.font = '900 64px serif';
          sCtx.textAlign = 'center';
          sCtx.fillText('🏛️ TIỆM VÀNG BẠC ĐÁ QUÝ DJN', 512, 105);

          sCtx.fillStyle = '#fef08a';
          sCtx.font = 'bold 28px sans-serif';
          sCtx.fillText('VÀNG MIẾNG 9999 • TRANG SỨC CAO CẤP • TỶ GIÁ THẾ GIỚI', 512, 175);
        }
        const djnSignTex = new THREE.CanvasTexture(signCanvas);
        const djnSignMesh = new THREE.Mesh(
          new THREE.BoxGeometry(6.6, 1.3, 0.15),
          new THREE.MeshStandardMaterial({ map: djnSignTex, roughness: 0.3 })
        );
        djnSignMesh.position.set(0, 4.0, -4.15);
        townGroup.add(djnSignMesh);

        // --- GIANT ELECTRONIC LIVE GOLD BILLBOARD (BẢNG GIÁ VÀNG QUỐC TẾ) ---
        this.goldBillboard = new GoldBillboardSystem();
        this.goldBillboard.mesh.position.set(0, 8.2, -4.12);
        townGroup.add(this.goldBillboard.mesh);

        // Storefront Spotlights
        const signSpot = new THREE.PointLight(0xffd700, 1.8, 14);
        signSpot.position.set(0, 5.2, -5.0);
        townGroup.add(signSpot);

        continue;
      }

      // Other Shophouses
      const bColor = colors[Math.abs(i) % colors.length];
      const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.85 });

      // 2-3 Storey Shophouse
      const height = 9 + (Math.abs(i) % 3) * 1.5;
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(buildingWidth - 0.4, height, 8), bMat);
      bMesh.position.set(i * buildingWidth, height / 2, 0);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      townGroup.add(bMesh);

      // Windows with green shutters
      const shutterMat = new THREE.MeshStandardMaterial({ color: 0x1b4332 });
      const windowMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1 });

      [-1.8, 1.8].forEach((wx) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.1), windowMat);
        win.position.set(i * buildingWidth + wx, height * 0.65, -4.05);
        townGroup.add(win);

        const shutterL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.08), shutterMat);
        shutterL.position.set(i * buildingWidth + wx - 0.7, height * 0.65, -4.06);
        townGroup.add(shutterL);

        const shutterR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.08), shutterMat);
        shutterR.position.set(i * buildingWidth + wx + 0.7, height * 0.65, -4.06);
        townGroup.add(shutterR);
      });

      // Ground floor shop awning
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth - 0.8, 0.15, 2.0),
        new THREE.MeshStandardMaterial({ color: (i % 2 === 0) ? 0x9e2a2b : 0x1d3557 })
      );
      awning.position.set(i * buildingWidth, 3.8, -4.8);
      awning.rotation.x = 0.2;
      awning.castShadow = true;
      townGroup.add(awning);
    }

    this.scene.add(townGroup);
  }

  // 8. Signboard
  private buildSignboard() {
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 4.2, -4.5);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#422a15';
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, 992, 224);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 64px serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRÀ ĐÁ THỊ TRƯỜNG', 512, 105);

      ctx.fillStyle = '#e8d5b5';
      ctx.font = 'italic 34px sans-serif';
      ctx.fillText('"Ngồi xuống uống chén trà, nghe bà soi thị trường."', 512, 175);
    }

    const signTex = new THREE.CanvasTexture(canvas);
    const signGeo = new THREE.BoxGeometry(5.2, 1.3, 0.15);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.7,
      metalness: 0.1,
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.castShadow = true;
    signGroup.add(signMesh);

    // Hanging lanterns
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30,
      emissive: 0xff4500,
      emissiveIntensity: 0.4,
    });
    const lanternGeo = new THREE.SphereGeometry(0.28, 8, 8);

    const lanternL = new THREE.Mesh(lanternGeo, lanternMat);
    lanternL.position.set(-2.8, -0.4, 0);
    signGroup.add(lanternL);

    const lanternR = new THREE.Mesh(lanternGeo, lanternMat);
    lanternR.position.set(2.8, -0.4, 0);
    signGroup.add(lanternR);

    this.scene.add(signGroup);
  }

  // 9. Blackboard
  private buildBlackboard() {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(-3.8, 0, 0.5);
    boardGroup.rotation.y = 0.4;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e241c';
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#f5f5f5';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ BẢNG TIN TRADER ⚡', 256, 70);

      ctx.fillStyle = '#ffeaa7';
      ctx.font = '28px sans-serif';
      ctx.fillText('Nến chưa đóng', 256, 140);
      ctx.fillText('Chớ vội đóng băng lòng!', 256, 185);

      ctx.fillStyle = '#74b9ff';
      ctx.font = 'italic 26px sans-serif';
      ctx.fillText('Trà đá mát lạnh: 5k', 256, 260);
      ctx.fillText('Lời khuyên cắt lỗ: Free', 256, 310);
      ctx.fillText('Kèo chuẩn: Tuỳ duyên!', 256, 360);

      ctx.fillStyle = '#ff7675';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Stop-loss là bạn, FOMO là bay màu', 256, 440);
    }

    const boardTex = new THREE.CanvasTexture(canvas);
    const boardGeo = new THREE.BoxGeometry(1.4, 1.8, 0.08);
    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      roughness: 0.9,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 1.3;
    board.castShadow = true;
    boardGroup.add(board);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.8 });
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6);
    const legL = new THREE.Mesh(legGeo, frameMat);
    legL.position.set(-0.55, 0.8, -0.15);
    legL.rotation.z = -0.15;
    boardGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, frameMat);
    legR.position.set(0.55, 0.8, -0.15);
    legR.rotation.z = 0.15;
    boardGroup.add(legR);

    this.scene.add(boardGroup);
    this.collisionSystem.addBox(-4.6, 0.0, -3.0, 1.0);
  }

  // 10. Surrounding village scenery
  private buildVillageSurroundings() {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x6e5238, roughness: 0.8 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d7034, roughness: 0.7, flatShading: true });

    for (let i = -16; i <= 16; i += 2) {
      if (Math.abs(i) > 9) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), fenceMat);
        post.position.set(i, 0.9, -7.5);
        post.castShadow = true;
        this.scene.add(post);
      }
    }

    const bushPositions = [
      { x: -7, z: -5, s: 1.2 },
      { x: 8, z: -5, s: 1.5 },
      { x: 9.5, z: 2, s: 1.1 },
      { x: -9, z: 3, s: 1.3 },
    ];
    bushPositions.forEach((bp) => {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(bp.s, 1), bushMat);
      bush.position.set(bp.x, bp.s * 0.7, bp.z);
      bush.castShadow = true;
      bush.receiveShadow = true;
      this.scene.add(bush);
      this.collisionSystem.addCylinder(bp.x, bp.z, bp.s);
    });
  }
}
