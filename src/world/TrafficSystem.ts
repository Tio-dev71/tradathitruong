import * as THREE from 'three';

export interface Vehicle {
  mesh: THREE.Group;
  type: 'motorbike' | 'car' | 'taxi';
  speed: number;
  direction: number; // 1 = moving right (+x), -1 = moving left (-x)
  wheels: THREE.Mesh[];
}

export class TrafficSystem {
  private scene: THREE.Scene;
  private vehicles: Vehicle[] = [];
  private spawnTimer = 0;
  private roadZ = 16; // Z coordinate of the road strip

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Build a stylized Vietnamese Motorbike (Honda Dream / Wave)
  private createMotorbikeMesh(color: number): { group: THREE.Group; wheels: THREE.Mesh[] } {
    const group = new THREE.Group();
    const wheels: THREE.Mesh[] = [];

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 0.8 });

    // Chassis & Engine body
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.45, 1.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Long black leather seat
    const seatGeo = new THREE.BoxGeometry(0.28, 0.12, 0.8);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.8, -0.1);
    group.add(seat);

    // Front fork & Handlebars
    const forkGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6);
    const fork = new THREE.Mesh(forkGeo, metalMat);
    fork.position.set(0, 0.7, 0.5);
    fork.rotation.x = -0.25;
    group.add(fork);

    const barGeo = new THREE.BoxGeometry(0.65, 0.04, 0.04);
    const bar = new THREE.Mesh(barGeo, metalMat);
    bar.position.set(0, 0.95, 0.45);
    group.add(bar);

    // Front Headlight
    const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0, 0.9, 0.55);
    group.add(light);

    // Wheels (Front & Rear)
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const frontWheel = new THREE.Mesh(wheelGeo, rubberMat);
    frontWheel.position.set(0, 0.28, 0.65);
    frontWheel.castShadow = true;
    group.add(frontWheel);
    wheels.push(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, rubberMat);
    rearWheel.position.set(0, 0.28, -0.65);
    rearWheel.castShadow = true;
    group.add(rearWheel);
    wheels.push(rearWheel);

    // Chibi Rider sitting on the bike wearing a helmet!
    const riderGroup = new THREE.Group();
    riderGroup.position.set(0, 0.85, -0.05);

    const riderShirtMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 }); // Green shirt
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c }); // Red helmet

    const riderTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.45, 8), riderShirtMat);
    riderTorso.position.y = 0.22;
    riderGroup.add(riderTorso);

    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), helmetMat);
    riderHead.position.y = 0.55;
    riderGroup.add(riderHead);

    group.add(riderGroup);

    return { group, wheels };
  }

  // Build a stylized Vietnamese Taxi / Sedan (Mai Linh Green or White Taxi)
  private createCarMesh(color: number, isTaxi = false): { group: THREE.Group; wheels: THREE.Mesh[] } {
    const group = new THREE.Group();
    const wheels: THREE.Mesh[] = [];

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.1 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 0.8 });
    const redLightMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.6 });

    // Lower car chassis
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.6, 3.6);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    group.add(chassis);

    // Cabin roof & windows
    const cabinGeo = new THREE.BoxGeometry(1.35, 0.55, 1.9);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.1, -0.15);
    cabin.castShadow = true;
    group.add(cabin);

    // Taxi Signboard on top if taxi
    if (isTaxi) {
      const taxiSignGeo = new THREE.BoxGeometry(0.5, 0.18, 0.25);
      const taxiSignMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.5 });
      const sign = new THREE.Mesh(taxiSignGeo, taxiSignMat);
      sign.position.set(0, 1.45, -0.15);
      group.add(sign);
    }

    // Headlights
    [-0.55, 0.55].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.05), lightMat);
      hl.position.set(x, 0.6, 1.8);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.05), redLightMat);
      tl.position.set(x, 0.6, -1.8);
      group.add(tl);
    });

    // 4 Car Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      { x: -0.85, z: 1.1 },
      { x: 0.85, z: 1.1 },
      { x: -0.85, z: -1.1 },
      { x: 0.85, z: -1.1 },
    ];

    wheelOffsets.forEach((wo) => {
      const wheel = new THREE.Mesh(wheelGeo, rubberMat);
      wheel.position.set(wo.x, 0.32, wo.z);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    });

    return { group, wheels };
  }

  private spawnVehicle() {
    const isMovingRight = Math.random() > 0.5;
    const direction = isMovingRight ? 1 : -1;
    const spawnX = isMovingRight ? -36 : 36;
    const speed = 7 + Math.random() * 5; // 7 to 12 units/sec

    const randType = Math.random();
    let type: 'motorbike' | 'car' | 'taxi' = 'motorbike';
    let vehicleData: { group: THREE.Group; wheels: THREE.Mesh[] };

    if (randType < 0.6) {
      // 60% chance: Motorbike (Xe máy - most common in VN!)
      type = 'motorbike';
      const colors = [0xd32f2f, 0x1976d2, 0x2e7d32, 0x37474f, 0xf57c00];
      const c = colors[Math.floor(Math.random() * colors.length)];
      vehicleData = this.createMotorbikeMesh(c);
      // Lane offset for motorbike (closer to sidewalk: lane Z ~ 14.8 or 15.5)
      const laneZ = isMovingRight ? 14.8 : 17.2;
      vehicleData.group.position.set(spawnX, 0, laneZ);
    } else if (randType < 0.85) {
      // 25% chance: Taxi Mai Linh (Green) or Vinasun (White/Red)
      type = 'taxi';
      const isMaiLinh = Math.random() > 0.5;
      const c = isMaiLinh ? 0x00843d : 0xf8f9fa;
      vehicleData = this.createCarMesh(c, true);
      const laneZ = isMovingRight ? 15.2 : 16.8;
      vehicleData.group.position.set(spawnX, 0, laneZ);
    } else {
      // 15% chance: Family Sedan
      type = 'car';
      const colors = [0x212121, 0x90a4ae, 0x0d47a1, 0x5d4037];
      const c = colors[Math.floor(Math.random() * colors.length)];
      vehicleData = this.createCarMesh(c, false);
      const laneZ = isMovingRight ? 15.2 : 16.8;
      vehicleData.group.position.set(spawnX, 0, laneZ);
    }

    // Orient vehicle facing movement direction
    vehicleData.group.rotation.y = isMovingRight ? Math.PI / 2 : -Math.PI / 2;

    this.scene.add(vehicleData.group);

    this.vehicles.push({
      mesh: vehicleData.group,
      type,
      speed,
      direction,
      wheels: vehicleData.wheels,
    });
  }

  public update(delta: number) {
    this.spawnTimer += delta;

    // Spawn vehicle every 5 to 9 seconds, or initial population
    if (this.vehicles.length === 0 || this.spawnTimer > 6.0) {
      this.spawnTimer = 0;
      if (this.vehicles.length < 5) {
        this.spawnVehicle();
      }
    }

    // Move vehicles along the road
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.mesh.position.x += v.direction * v.speed * delta;

      // Spin wheels
      const wheelRotSpeed = (v.speed / 0.3) * delta * v.direction;
      v.wheels.forEach((w) => {
        w.rotation.x += wheelRotSpeed;
      });

      // Remove vehicles that driven off screen past 40 units
      if ((v.direction === 1 && v.mesh.position.x > 40) || (v.direction === -1 && v.mesh.position.x < -40)) {
        this.scene.remove(v.mesh);
        this.vehicles.splice(i, 1);
      }
    }
  }

  public dispose() {
    this.vehicles.forEach((v) => {
      this.scene.remove(v.mesh);
    });
    this.vehicles = [];
  }
}
