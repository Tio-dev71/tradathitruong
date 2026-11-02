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
    playerRadius: number = 0.5
  ): { x: number; z: number } {
    let newX = targetPos.x;
    let newZ = targetPos.z;

    // 1. World boundaries
    newX = Math.max(this.boundary.minX + playerRadius, Math.min(this.boundary.maxX - playerRadius, newX));
    newZ = Math.max(this.boundary.minZ + playerRadius, Math.min(this.boundary.maxZ - playerRadius, newZ));

    // 2. Cylinder obstacles (e.g. tree trunk, barrels)
    for (const c of this.cylinders) {
      const minDistance = c.radius + playerRadius;
      const dx = newX - c.x;
      const dz = newZ - c.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDistance * minDistance && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = minDistance - dist;
        // Push out along collision normal
        newX += (dx / dist) * overlap;
        newZ += (dz / dist) * overlap;
      }
    }

    // 3. Box obstacles (e.g. tables, walls, counters)
    for (const b of this.boxes) {
      const expandedMinX = b.minX - playerRadius;
      const expandedMaxX = b.maxX + playerRadius;
      const expandedMinZ = b.minZ - playerRadius;
      const expandedMaxZ = b.maxZ + playerRadius;

      if (
        newX > expandedMinX &&
        newX < expandedMaxX &&
        newZ > expandedMinZ &&
        newZ < expandedMaxZ
      ) {
        // Find closest edge to push player out
        const distLeft = Math.abs(newX - expandedMinX);
        const distRight = Math.abs(newX - expandedMaxX);
        const distTop = Math.abs(newZ - expandedMinZ);
        const distBottom = Math.abs(newZ - expandedMaxZ);

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        if (minDist === distLeft) newX = expandedMinX;
        else if (minDist === distRight) newX = expandedMaxX;
        else if (minDist === distTop) newZ = expandedMinZ;
        else newZ = expandedMaxZ;
      }
    }

    return { x: newX, z: newZ };
  }
}
