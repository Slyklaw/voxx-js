import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BlockType, BlockProperties } from '../world/BlockType.js';

export class BlockRenderer {
    constructor() {
        this.geometryCache = new Map();
        this.materialCache = new Map();
    }

    createBlockMesh(block) {
        const properties = BlockProperties[block.type];
        if (!properties || !properties.solid) {
            return null;
        }

        const geometry = this.getBlockGeometry();
        const material = this.getBlockMaterial(block.type);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(block.position.x, block.position.y, block.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }

    getBlockGeometry() {
        if (!this.geometryCache.has('block')) {
            this.geometryCache.set('block', new THREE.BoxGeometry(1, 1, 1));
        }
        return this.geometryCache.get('block');
    }

    getBlockMaterial(blockType) {
        if (!this.materialCache.has(blockType)) {
            const properties = BlockProperties[blockType];
            const material = new THREE.MeshLambertMaterial({
                color: properties.color,
                transparent: properties.transparent,
                opacity: properties.transparent ? 0.8 : 1.0
            });
            this.materialCache.set(blockType, material);
        }
        return this.materialCache.get(blockType);
    }

    createBlockAtPosition(blockType, x, y, z) {
        const properties = BlockProperties[blockType];
        if (!properties || !properties.solid) {
            return null;
        }

        const geometry = this.getBlockGeometry();
        const material = this.getBlockMaterial(blockType);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }

    /**
     * Get the color for a block type
     * @param {BlockType} blockType - The type of block
     * @returns {THREE.Color|null} The color for the block type
     */
    getBlockColor(blockType) {
        const properties = BlockProperties[blockType];
        if (!properties) return null;
        
        return new THREE.Color(properties.color);
    }

    dispose() {
        // Clean up cached geometries and materials
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.materialCache.forEach(material => material.dispose());
        this.geometryCache.clear();
        this.materialCache.clear();
    }
}
