import { BlockType, BlockProperties } from './BlockType.js';

export class Block {
    constructor(type = BlockType.AIR, x = 0, y = 0, z = 0) {
        this.type = type;
        this.position = { x, y, z };
        this.metadata = {};
    }

    get isSolid() {
        return BlockProperties[this.type]?.solid || false;
    }

    get isTransparent() {
        return BlockProperties[this.type]?.transparent || false;
    }

    get color() {
        return BlockProperties[this.type]?.color || 0x000000;
    }

    get name() {
        return BlockProperties[this.type]?.name || 'Unknown';
    }

    setType(newType) {
        this.type = newType;
    }

    clone() {
        return new Block(this.type, this.position.x, this.position.y, this.position.z);
    }

    equals(other) {
        return other instanceof Block && 
               this.type === other.type && 
               this.position.x === other.position.x &&
               this.position.y === other.position.y &&
               this.position.z === other.position.z;
    }

    toJSON() {
        return {
            type: this.type,
            position: this.position,
            metadata: this.metadata
        };
    }

    static fromJSON(data) {
        const block = new Block(data.type, data.position.x, data.position.y, data.position.z);
        block.metadata = data.metadata || {};
        return block;
    }
}
