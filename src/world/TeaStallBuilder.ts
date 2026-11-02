import * as THREE from 'three';
import type { CollisionSystem } from './CollisionSystem';

export class TeaStallBuilder {
  private scene: THREE.Scene;
  private collisionSystem: CollisionSystem;

  constructor(scene: THREE.Scene, collisionSystem: CollisionSystem) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
  }

  public buildAll() {
    this.buildGround();
    this.buildBanyanTree();
    this.buildColonialWall();
    this.buildTeaTableAndProps();
    this.buildPlasticStools();
    this.buildSignboard();
    this.buildBlackboard();
    this.buildVillageSurroundings();
  }

  // 1. Sidewalk pavement & Village road
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

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tileTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Dirt road strip on the front edge
    const roadGeo = new THREE.PlaneGeometry(60, 16);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x6e5944,
      roughness: 0.95,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.02, 16);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // Curb edge separating sidewalk from road
    const curbGeo = new THREE.BoxGeometry(60, 0.25, 0.6);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.7 });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(0, 0.12, 8);
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

    // Register tree trunk in collision system
    this.collisionSystem.addCylinder(treeX, treeZ, 2.4);

    // Hanging aerial roots (Rễ phụ buông rủ)
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

  // 3. Weathered Vietnamese yellow wall with stencil graffiti
  private buildColonialWall() {
    const wallGroup = new THREE.Group();
    wallGroup.position.set(0, 0, -8);

    // Canvas texture for vintage wall with "KHOAN CẮT BÊ TÔNG"
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 1024;
    wallCanvas.height = 512;
    const ctx = wallCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#dfaa46'; // Hanoi classic colonial ochre yellow
      ctx.fillRect(0, 0, 1024, 512);

      // Weathering & rêu phong
      ctx.fillStyle = '#a67d32';
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 512, 40 + Math.random() * 60, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mold/moss patches near bottom
      ctx.fillStyle = '#4f5e3b';
      ctx.fillRect(0, 420, 1024, 92);

      // Stenciled Vietnamese phone numbers "KH.C. BÊ TÔNG 0912.289.306"
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

    // Corrugated iron awning (Mái tôn rỉ sét)
    const roofGeo = new THREE.BoxGeometry(26, 0.1, 4.5);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x6e4a3b, // Rusted metal color
      roughness: 0.8,
      metalness: 0.3,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 5.5, 2.0);
    roof.rotation.x = 0.2;
    roof.castShadow = true;
    wallGroup.add(roof);

    // Wall collision
    this.collisionSystem.addBox(-14, -8.6, 14, -7.4);

    this.scene.add(wallGroup);
  }

  // 4. Main Tea Stall Table & Vietnamese Tea Props
  private buildTeaTableAndProps() {
    const stallGroup = new THREE.Group();
    const stallX = 0;
    const stallZ = -1.5;
    stallGroup.position.set(stallX, 0, stallZ);

    // Main low wooden tea table
    const tableTopGeo = new THREE.BoxGeometry(3.2, 0.12, 1.6);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x543821, roughness: 0.75 });
    const tableTop = new THREE.Mesh(tableTopGeo, woodMat);
    tableTop.position.y = 0.8;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    stallGroup.add(tableTop);

    // Table legs
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

    // Traditional straw-insulated tea basket with blue ceramic teapot (Ấm tích ủ rơm)
    const strawBasketGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.45, 12);
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.95 });
    const strawBasket = new THREE.Mesh(strawBasketGeo, strawMat);
    strawBasket.position.set(-0.8, 1.08, 0.1);
    strawBasket.castShadow = true;
    stallGroup.add(strawBasket);

    // Ceramic teapot neck & handle
    const teapotGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.25, 10);
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x1f4e78, roughness: 0.2, metalness: 0.1 });
    const teapot = new THREE.Mesh(teapotGeo, ceramicMat);
    teapot.position.set(-0.8, 1.35, 0.1);
    teapot.castShadow = true;
    stallGroup.add(teapot);

    // Classic Red Rạng Đông Thermos (Phích nước Rạng Đông)
    const thermosBodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, 12);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xbf1515, roughness: 0.4, metalness: 0.1 });
    const thermos = new THREE.Mesh(thermosBodyGeo, redMat);
    thermos.position.set(-1.2, 1.18, -0.2);
    thermos.castShadow = true;
    stallGroup.add(thermos);

    const thermosCapGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 10);
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.3 });
    const thermosCap = new THREE.Mesh(thermosCapGeo, silverMat);
    thermosCap.position.set(-1.2, 1.55, -0.2);
    stallGroup.add(thermosCap);

    // Traditional Vietnamese tea cups (Chén hoa cúc)
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

    // Plate of roasted sunflower seeds (Đĩa hạt hướng dương)
    const plateGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.04, 12);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0.8, 0.88, 0.1);
    stallGroup.add(plate);

    const seedsGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.03, 10);
    const seedsMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const seeds = new THREE.Mesh(seedsGeo, seedsMat);
    seeds.position.set(0.8, 0.91, 0.1);
    stallGroup.add(seeds);

    // Peanut basket (Rổ lạc luộc)
    const peanutBasketGeo = new THREE.CylinderGeometry(0.26, 0.2, 0.1, 10);
    const peanutBasketMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, roughness: 0.9 });
    const peanutBasket = new THREE.Mesh(peanutBasketGeo, peanutBasketMat);
    peanutBasket.position.set(0.9, 0.91, -0.35);
    stallGroup.add(peanutBasket);

    // Bamboo water pipe (Điếu cày nứa) leaning on the table
    const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8);
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xa87e3b, roughness: 0.5 });
    const pipe = new THREE.Mesh(pipeGeo, bambooMat);
    pipe.position.set(1.5, 0.5, 0.6);
    pipe.rotation.z = 0.4;
    pipe.rotation.x = 0.3;
    pipe.castShadow = true;
    stallGroup.add(pipe);

    this.scene.add(stallGroup);
  }

  // 5. Iconic Red & Blue Vietnamese Plastic Stools (Ghế nhựa vỉa hè)
  private buildPlasticStools() {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdf2828, roughness: 0.5 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d70b8, roughness: 0.5 });

    const createStool = (x: number, z: number, colorMat: THREE.Material) => {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(x, 0, z);

      // Seat top
      const seatGeo = new THREE.BoxGeometry(0.48, 0.06, 0.48);
      const seat = new THREE.Mesh(seatGeo, colorMat);
      seat.position.y = 0.42;
      seat.castShadow = true;
      stoolGroup.add(seat);

      // 4 tapered angled legs
      const legGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.42, 6);
      const legOffsets = [
        { x: -0.18, z: -0.18 },
        { x: 0.18, z: -0.18 },
        { x: -0.18, z: 0.18 },
        { x: 0.18, z: 0.18 },
      ];
      legOffsets.forEach((lo) => {
        const leg = new THREE.Mesh(legGeo, colorMat);
        leg.position.set(lo.x, 0.21, lo.z);
        leg.castShadow = true;
        stoolGroup.add(leg);
      });

      this.scene.add(stoolGroup);
      this.collisionSystem.addCylinder(x, z, 0.35);
    };

    // Stool positions around the table and along the sidewalk
    const stoolList = [
      { x: -1.2, z: 0.2, mat: redMat },
      { x: -0.4, z: 0.4, mat: blueMat },
      { x: 0.4, z: 0.5, mat: redMat },
      { x: 1.3, z: 0.3, mat: blueMat },
      { x: -2.4, z: -0.8, mat: redMat },
      { x: 2.5, z: -0.5, mat: blueMat },
      { x: -2.0, z: 2.2, mat: blueMat },
      { x: 2.2, z: 2.5, mat: redMat },
    ];

    stoolList.forEach((s) => createStool(s.x, s.z, s.mat));
  }

  // 6. Signboard: "TRÀ ĐÁ THỊ TRƯỜNG"
  private buildSignboard() {
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 4.2, -4.5);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#422a15'; // Dark wood
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = '#d4af37'; // Gold border
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, 992, 224);

      ctx.fillStyle = '#ffd700'; // Golden yellow lettering
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

    // Hanging warm lanterns on both sides of the sign
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

  // 7. Small Blackboard with humorous market quotes
  private buildBlackboard() {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(-3.8, 0, 0.5);
    boardGroup.rotation.y = 0.4;

    // Blackboard canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e241c'; // Slate chalkboard color
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#f5f5f5'; // Chalk white
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

    // Wooden easel frame
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

  // 8. Surrounding village scenery, wooden fence & decorative shrubs
  private buildVillageSurroundings() {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x6e5238, roughness: 0.8 });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d7034, roughness: 0.7, flatShading: true });

    // Bamboo / wood fence along sides
    for (let i = -16; i <= 16; i += 2) {
      if (Math.abs(i) > 9) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), fenceMat);
        post.position.set(i, 0.9, -7.5);
        post.castShadow = true;
        this.scene.add(post);
      }
    }

    // Shrubs & flower bushes
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
