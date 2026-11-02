export interface CylinderObstacle {
  x: number;
  z: number;
  radius: number;
}

export interface BoxObstacle {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export class CollisionSystem {
  private cylinders: CylinderObstacle[] = [];
  private boxes: BoxObstacle[] = [];

  // Boundaries of the tea stall area (walkable world boundary)
  public boundary = {
    minX: -24,
    maxX: 24,
    minZ: -24,
    maxZ: 24,
  };

  public addCylinder(x: number, z: number, radius: number) {
    this.cylinders.push({ x, z, radius });
  }

  public addBox(minX: number, minZ: number, maxX: number, maxZ: number) {
    this.boxes.push({ minX, minZ, maxX, maxZ });
  }

  public resolveMovement(
    currentPos: { x: number; z: number },
    targetPos: { x: number; z: number },
    playerRadius: number = 0.45
  ): { x: number; z: number } {
    let newX = targetPos.x;
    let newZ = targetPos.z;

    // 1. World boundaries
    newX = Math.max(this.boundary.minX + playerRadius, Math.min(this.boundary.maxX - playerRadius, newX));
    newZ = Math.max(this.boundary.minZ + playerRadius, Math.min(this.boundary.maxZ - playerRadius, newZ));

    // Collision check helper
    const collidesAt = (px: number, pz: number) => {
      // Check cylinders
      for (const c of this.cylinders) {
        const minDistance = c.radius + playerRadius;
        const dx = px - c.x;
        const dz = pz - c.z;
        if (dx * dx + dz * dz < minDistance * minDistance) {
          return true;
        }
      }
      // Check boxes
      for (const b of this.boxes) {
        if (
          px > b.minX - playerRadius &&
          px < b.maxX + playerRadius &&
          pz > b.minZ - playerRadius &&
          pz < b.maxZ + playerRadius
        ) {
          return true;
        }
      }
      return false;
    };

    // 2. Axis-independent sliding resolution (Quake / Unity style wall sliding)
    // First step: Move along X only
    let resolvedX = newX;
    if (collidesAt(resolvedX, currentPos.z)) {
      resolvedX = currentPos.x; // Blocked along X, allow sliding along Z
    }

    // Second step: Move along Z using resolved X
    let resolvedZ = newZ;
    if (collidesAt(resolvedX, resolvedZ)) {
      resolvedZ = currentPos.z; // Blocked along Z, allow sliding along X
    }

    return { x: resolvedX, z: resolvedZ };
  }
}

