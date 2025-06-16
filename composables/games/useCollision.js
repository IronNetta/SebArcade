// composables/games/useCollision.js
export const useCollision = () => {

    // Collision entre deux rectangles (AABB - Axis Aligned Bounding Box)
    const rectToRect = (rect1, rect2) => {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
    }

    // Collision entre deux cercles
    const circleToCircle = (circle1, circle2) => {
        const dx = circle1.x - circle2.x
        const dy = circle1.y - circle2.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        return distance < circle1.radius + circle2.radius
    }

    // Collision entre un cercle et un rectangle
    const circleToRect = (circle, rect) => {
        // Trouver le point le plus proche du centre du cercle sur le rectangle
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width))
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height))

        // Calculer la distance entre le centre du cercle et ce point
        const dx = circle.x - closestX
        const dy = circle.y - closestY
        const distance = Math.sqrt(dx * dx + dy * dy)

        return distance < circle.radius
    }

    // Collision point dans rectangle
    const pointInRect = (point, rect) => {
        return point.x >= rect.x &&
            point.x <= rect.x + rect.width &&
            point.y >= rect.y &&
            point.y <= rect.y + rect.height
    }

    // Collision point dans cercle
    const pointInCircle = (point, circle) => {
        const dx = point.x - circle.x
        const dy = point.y - circle.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        return distance <= circle.radius
    }

    // Collision ligne avec rectangle
    const lineToRect = (line, rect) => {
        // Vérifier si une des extrémités de la ligne est dans le rectangle
        if (pointInRect(line.start, rect) || pointInRect(line.end, rect)) {
            return true
        }

        // Vérifier l'intersection avec chaque côté du rectangle
        const sides = [
            { start: { x: rect.x, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y } }, // Top
            { start: { x: rect.x + rect.width, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y + rect.height } }, // Right
            { start: { x: rect.x + rect.width, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y + rect.height } }, // Bottom
            { start: { x: rect.x, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y } } // Left
        ]

        return sides.some(side => lineToLine(line, side))
    }

    // Collision entre deux lignes
    const lineToLine = (line1, line2) => {
        const x1 = line1.start.x, y1 = line1.start.y
        const x2 = line1.end.x, y2 = line1.end.y
        const x3 = line2.start.x, y3 = line2.start.y
        const x4 = line2.end.x, y4 = line2.end.y

        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

        if (denominator === 0) return false // Lignes parallèles

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator

        return t >= 0 && t <= 1 && u >= 0 && u <= 1
    }

    // Collision avec polygone (utilise ray casting)
    const pointInPolygon = (point, polygon) => {
        let inside = false

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y
            const xj = polygon[j].x, yj = polygon[j].y

            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside
            }
        }

        return inside
    }

    // Détection de collision avec une grille (pour jeux comme Tetris, Snake)
    const pointInGrid = (point, grid, cellSize) => {
        const gridX = Math.floor(point.x / cellSize)
        const gridY = Math.floor(point.y / cellSize)

        if (gridX < 0 || gridX >= grid[0].length || gridY < 0 || gridY >= grid.length) {
            return { collision: true, type: 'boundary' }
        }

        if (grid[gridY][gridX] !== 0) {
            return { collision: true, type: 'occupied', gridX, gridY, value: grid[gridY][gridX] }
        }

        return { collision: false, gridX, gridY }
    }

    // Collision avec les limites d'une zone
    const checkBounds = (object, bounds) => {
        const collisions = {
            left: object.x < bounds.x,
            right: object.x + (object.width || 0) > bounds.x + bounds.width,
            top: object.y < bounds.y,
            bottom: object.y + (object.height || 0) > bounds.y + bounds.height
        }

        return {
            hasCollision: Object.values(collisions).some(Boolean),
            sides: collisions
        }
    }

    // Résolution de collision simple (rebond)
    const resolveCollision = (object, bounds, bounceFactor = 1) => {
        const collision = checkBounds(object, bounds)

        if (collision.hasCollision) {
            if (collision.sides.left) {
                object.x = bounds.x
                if (object.velocityX < 0) object.velocityX *= -bounceFactor
            }
            if (collision.sides.right) {
                object.x = bounds.x + bounds.width - (object.width || 0)
                if (object.velocityX > 0) object.velocityX *= -bounceFactor
            }
            if (collision.sides.top) {
                object.y = bounds.y
                if (object.velocityY < 0) object.velocityY *= -bounceFactor
            }
            if (collision.sides.bottom) {
                object.y = bounds.y + bounds.height - (object.height || 0)
                if (object.velocityY > 0) object.velocityY *= -bounceFactor
            }
        }

        return collision
    }

    // Détection de collision entre plusieurs objets
    const detectCollisions = (objects, collisionFunction = rectToRect) => {
        const collisions = []

        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                if (collisionFunction(objects[i], objects[j])) {
                    collisions.push({
                        objectA: objects[i],
                        objectB: objects[j],
                        indexA: i,
                        indexB: j
                    })
                }
            }
        }

        return collisions
    }

    // Spatial hashing pour optimiser les collisions (pour beaucoup d'objets)
    const createSpatialHash = (cellSize) => {
        const hash = new Map()

        const getHash = (x, y) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`

        const insert = (object) => {
            const hashes = []
            const startX = Math.floor(object.x / cellSize)
            const endX = Math.floor((object.x + (object.width || 0)) / cellSize)
            const startY = Math.floor(object.y / cellSize)
            const endY = Math.floor((object.y + (object.height || 0)) / cellSize)

            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    const key = `${x},${y}`
                    hashes.push(key)

                    if (!hash.has(key)) {
                        hash.set(key, [])
                    }
                    hash.get(key).push(object)
                }
            }

            object._spatialHashes = hashes
        }

        const remove = (object) => {
            if (object._spatialHashes) {
                object._spatialHashes.forEach(key => {
                    const cell = hash.get(key)
                    if (cell) {
                        const index = cell.indexOf(object)
                        if (index > -1) {
                            cell.splice(index, 1)
                            if (cell.length === 0) {
                                hash.delete(key)
                            }
                        }
                    }
                })
                delete object._spatialHashes
            }
        }

        const getPotentialCollisions = (object) => {
            const potential = new Set()
            const startX = Math.floor(object.x / cellSize)
            const endX = Math.floor((object.x + (object.width || 0)) / cellSize)
            const startY = Math.floor(object.y / cellSize)
            const endY = Math.floor((object.y + (object.height || 0)) / cellSize)

            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    const cell = hash.get(`${x},${y}`)
                    if (cell) {
                        cell.forEach(obj => {
                            if (obj !== object) {
                                potential.add(obj)
                            }
                        })
                    }
                }
            }

            return Array.from(potential)
        }

        const clear = () => {
            hash.clear()
        }

        return {
            insert,
            remove,
            getPotentialCollisions,
            clear
        }
    }

    // Utilitaires mathématiques pour les collisions
    const distance = (point1, point2) => {
        const dx = point1.x - point2.x
        const dy = point1.y - point2.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    const normalize = (vector) => {
        const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
        return magnitude === 0 ? { x: 0, y: 0 } : { x: vector.x / magnitude, y: vector.y / magnitude }
    }

    const dotProduct = (vector1, vector2) => {
        return vector1.x * vector2.x + vector1.y * vector2.y
    }

    return {
        // Fonctions de collision de base
        rectToRect,
        circleToCircle,
        circleToRect,
        pointInRect,
        pointInCircle,
        lineToRect,
        lineToLine,
        pointInPolygon,
        pointInGrid,

        // Gestion des limites
        checkBounds,
        resolveCollision,

        // Détection multiple
        detectCollisions,
        createSpatialHash,

        // Utilitaires
        distance,
        normalize,
        dotProduct
    }
}