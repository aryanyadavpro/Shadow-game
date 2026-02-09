// Shadow Combat - A Shadow Fight Style Game
// ==========================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game State
const GameState = {
    MENU: 'menu',
    INTRO: 'intro',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

let gameState = GameState.MENU;
let gameLoop;

// Input State
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    q: false,
    e: false,
    r: false
};

let mouseDown = false;
let lastClickTime = 0;
let clickCount = 0;

// Attack Types
const AttackType = {
    NONE: 'none',
    SLASH: 'slash',
    POWER_SLASH: 'power_slash',
    FLYING_KICK: 'flying_kick',
    COMBO: 'combo',
    UPPERCUT: 'uppercut',
    KO_STRIKE: 'ko_strike',
    SOLAR_BEAM: 'solar_beam',
    EARTHQUAKE: 'earthquake'
};

// Character Types
const CharacterType = {
    SOLAR: 'solar',
    EARTH: 'earth'
};

let selectedCharacter = CharacterType.SOLAR;

// Game Constants
const GRAVITY = 0.7;
const GROUND_Y = 0.85; // 85% of canvas height
const MAX_HEALTH = 500;

// Fighter Class
class Fighter {
    constructor(x, isPlayer = true, characterType = CharacterType.SOLAR) {
        this.isPlayer = isPlayer;
        this.characterType = characterType;
        this.x = x;
        this.y = 0;
        this.width = 60;
        this.height = 160;
        this.velocityX = 0;
        this.velocityY = 0;
        this.health = MAX_HEALTH;
        this.maxHealth = MAX_HEALTH;
        this.facingRight = isPlayer;
        
        // Combat properties
        this.isAttacking = false;
        this.currentAttack = AttackType.NONE;
        this.attackFrame = 0;
        this.attackDuration = 25;
        this.attackCooldown = 0;
        this.hitCooldown = 0;
        this.canHit = true;
        this.comboCount = 0;
        this.comboTimer = 0;
        
        // Blocking
        this.isBlocking = false;
        
        // Animation
        this.state = 'idle';
        this.animationFrame = 0;
        this.animationTimer = 0;
        
        // Movement
        this.speed = 5;
        this.jumpForce = -16;
        this.isGrounded = true;
        
        // Body parts for realistic animation
        this.bodyParts = {
            head: { x: 0, y: 0, rotation: 0 },
            neck: { x: 0, y: 0 },
            shoulder_l: { x: 0, y: 0, rotation: 0 },
            shoulder_r: { x: 0, y: 0, rotation: 0 },
            elbow_l: { x: 0, y: 0, rotation: 0 },
            elbow_r: { x: 0, y: 0, rotation: 0 },
            hand_l: { x: 0, y: 0, rotation: 0 },
            hand_r: { x: 0, y: 0, rotation: 0 },
            torso: { x: 0, y: 0, rotation: 0 },
            hip: { x: 0, y: 0 },
            hip_l: { x: 0, y: 0, rotation: 0 },
            hip_r: { x: 0, y: 0, rotation: 0 },
            knee_l: { x: 0, y: 0, rotation: 0 },
            knee_r: { x: 0, y: 0, rotation: 0 },
            foot_l: { x: 0, y: 0, rotation: 0 },
            foot_r: { x: 0, y: 0, rotation: 0 }
        };
        
        // Sword properties
        this.swordLength = 70;
        this.swordAngle = 0;
        
        // Combat stats per attack type
        this.attackStats = {
            [AttackType.SLASH]: { damage: 8, range: 100, duration: 20 },
            [AttackType.POWER_SLASH]: { damage: 18, range: 120, duration: 35 },
            [AttackType.FLYING_KICK]: { damage: 15, range: 90, duration: 30 },
            [AttackType.COMBO]: { damage: 12, range: 100, duration: 25 },
            [AttackType.UPPERCUT]: { damage: 14, range: 80, duration: 25 },
            [AttackType.KO_STRIKE]: { damage: 30, range: 130, duration: 45 },
            [AttackType.SOLAR_BEAM]: { damage: 50, range: 2000, duration: 180 },
            [AttackType.EARTHQUAKE]: { damage: 50, range: 2000, duration: 150 }
        };
        
        // Special attack type based on character
        this.specialAttack = characterType === CharacterType.SOLAR ? AttackType.SOLAR_BEAM : AttackType.EARTHQUAKE;
        
        // Earthquake specific properties
        this.earthquakePhase = 0;  // 0: none, 1: jumping, 2: slamming, 3: shaking
        this.earthquakeShakeIntensity = 0;
        
        // Visual properties - Classic samurai style
        this.shadowColor = '#0a0a0a';
        this.outlineColor = isPlayer ? '#1a1a2e' : '#2e1a1a';  // Dark blue/red tint
        this.accentColor = isPlayer ? '#4a4a6a' : '#6a4a4a';  // Subtle accent
        this.clothColor = isPlayer ? '#0d0d15' : '#150d0d';  // Gi/hakama color
        this.swordColor = '#c0c0c0';  // Silver blade
        this.swordEdge = '#ffffff';  // Sharp edge highlight
        
        // Boost meter (only for player)
        this.boostMeter = 0;
        this.maxBoost = 100;
        this.isFiringSolarBeam = false;
        this.solarBeamFrame = 0;
        
        // Hair properties
        this.hairStrands = [];
        for (let i = 0; i < 8; i++) {
            this.hairStrands.push({
                angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.8,
                length: 15 + Math.random() * 12,
                wave: Math.random() * Math.PI * 2
            });
        }
        
        // Hit effect
        this.hitFlash = 0;
        this.knockback = 0;
        this.stunned = 0;
        
        // Jump physics
        this.jumpPhase = 0; // 0 = grounded, 1 = rising, 2 = falling
        this.jumpRotation = 0;
    }
    
    get groundY() {
        return canvas.height * GROUND_Y - this.height;
    }
    
    get centerX() {
        return this.x + this.width / 2;
    }
    
    get centerY() {
        return this.y + this.height / 2;
    }
    
    get attackBox() {
        const stats = this.attackStats[this.currentAttack] || { range: 100 };
        const range = stats.range;
        
        // Solar beam has huge range - covers entire screen
        if (this.currentAttack === AttackType.SOLAR_BEAM) {
            return {
                x: this.facingRight ? this.x + this.width : this.x - canvas.width,
                y: this.y - 50,
                width: canvas.width,
                height: 200
            };
        }
        
        // Earthquake covers entire ground area
        if (this.currentAttack === AttackType.EARTHQUAKE) {
            return {
                x: 0,
                y: canvas.height * GROUND_Y - 50,
                width: canvas.width,
                height: 200
            };
        }
        
        // Flying kick has different hitbox
        if (this.currentAttack === AttackType.FLYING_KICK) {
            return {
                x: this.facingRight ? this.x + this.width - 20 : this.x - range + 20,
                y: this.y + 60,
                width: range,
                height: 40
            };
        }
        
        return {
            x: this.facingRight ? this.x + this.width - 20 : this.x - range + 20,
            y: this.y + 20,
            width: range,
            height: this.height - 40
        };
    }
    
    update(opponent) {
        // Update facing direction
        if (!this.isAttacking || this.currentAttack === AttackType.NONE) {
            this.facingRight = opponent.centerX > this.centerX;
        }
        
        // Update stun
        if (this.stunned > 0) {
            this.stunned--;
            this.velocityX *= 0.9;
        }
        
        // Apply gravity
        this.velocityY += GRAVITY;
        
        // Update jump phase for realistic animation
        if (!this.isGrounded) {
            if (this.velocityY < 0) {
                this.jumpPhase = 1; // Rising
                this.jumpRotation = Math.min(this.jumpRotation + 0.05, 0.15);
            } else {
                this.jumpPhase = 2; // Falling
                this.jumpRotation = Math.max(this.jumpRotation - 0.03, -0.1);
            }
        } else {
            this.jumpPhase = 0;
            this.jumpRotation *= 0.8;
        }
        
        // Apply knockback decay
        if (this.knockback !== 0) {
            this.knockback *= 0.88;
            if (Math.abs(this.knockback) < 0.5) this.knockback = 0;
        }
        
        // Flying kick momentum
        if (this.currentAttack === AttackType.FLYING_KICK && this.attackFrame > 5 && this.attackFrame < 20) {
            const direction = this.facingRight ? 1 : -1;
            this.velocityX = direction * 12;
            this.velocityY = -2;
        }
        
        // Solar beam locks position
        if (this.currentAttack === AttackType.SOLAR_BEAM) {
            this.velocityX *= 0.5;
        }
        
        // Update position
        this.x += this.velocityX + this.knockback;
        this.y += this.velocityY;
        
        // Ground collision
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
        
        // Boundary collision
        const margin = 20;
        if (this.x < margin) this.x = margin;
        if (this.x + this.width > canvas.width - margin) this.x = canvas.width - margin - this.width;
        
        // Update cooldowns
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.hitCooldown > 0) this.hitCooldown--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.comboCount = 0;
        }
        
        // Update attack animation
        if (this.isAttacking) {
            this.attackFrame++;
            const stats = this.attackStats[this.currentAttack];
            const duration = stats ? stats.duration : 25;
            
            if (this.attackFrame >= duration) {
                this.isAttacking = false;
                this.currentAttack = AttackType.NONE;
                this.attackFrame = 0;
                this.attackCooldown = 12;
            }
        }
        
        // Update animation
        this.animationTimer++;
        if (this.animationTimer >= 6) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 8;
        }
        
        // Update state
        this.updateState();
        
        // Update body parts based on state
        this.updateBodyParts();
        
        // Friction
        if (this.isGrounded && this.currentAttack !== AttackType.FLYING_KICK) {
            this.velocityX *= 0.85;
        } else {
            this.velocityX *= 0.95;
        }
    }
    
    updateAnimation() {
        // Animation-only update for intro sequence
        this.animationTimer++;
        if (this.animationTimer >= 6) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 8;
        }
        this.updateState();
        this.updateBodyParts();
    }
    
    updateState() {
        if (this.stunned > 0) {
            this.state = 'stunned';
        } else if (this.isAttacking) {
            this.state = this.currentAttack;
        } else if (this.isBlocking) {
            this.state = 'block';
        } else if (!this.isGrounded) {
            this.state = 'jump';
        } else if (Math.abs(this.velocityX) > 0.5) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }
    }
    
    updateBodyParts() {
        const breathe = Math.sin(this.animationTimer * 0.15 + this.animationFrame * 0.3) * 2;
        const walkCycle = Math.sin(this.animationFrame * Math.PI / 4);
        
        switch (this.state) {
            case 'idle':
                this.setIdlePose(breathe);
                break;
            case 'walk':
                this.setWalkPose(walkCycle);
                break;
            case 'jump':
                this.setJumpPose();
                break;
            case 'block':
                this.setBlockPose();
                break;
            case AttackType.SLASH:
                this.setSlashPose();
                break;
            case AttackType.POWER_SLASH:
                this.setPowerSlashPose();
                break;
            case AttackType.FLYING_KICK:
                this.setFlyingKickPose();
                break;
            case AttackType.COMBO:
                this.setComboPose();
                break;
            case AttackType.UPPERCUT:
                this.setUppercutPose();
                break;
            case AttackType.KO_STRIKE:
                this.setKOStrikePose();
                break;
            case AttackType.SOLAR_BEAM:
                this.setSolarBeamPose();
                break;
            case AttackType.EARTHQUAKE:
                this.setEarthquakePose();
                break;
            case 'stunned':
                this.setStunnedPose();
                break;
        }
    }
    
    setIdlePose(breathe) {
        // Core body positioning
        this.bodyParts.torso = { x: 0, y: 55, rotation: 0 };
        this.bodyParts.head = { x: 0, y: 20 + breathe * 0.5, rotation: 0 };
        
        // Arms relaxed with sword ready
        this.bodyParts.shoulder_r = { x: 18, y: 35, rotation: Math.PI * 0.1 };
        this.bodyParts.elbow_r = { x: 32, y: 55, rotation: Math.PI * 0.3 };
        this.bodyParts.hand_r = { x: 42, y: 72, rotation: Math.PI * 0.2 };
        
        this.bodyParts.shoulder_l = { x: -18, y: 35, rotation: -Math.PI * 0.1 };
        this.bodyParts.elbow_l = { x: -28, y: 52, rotation: -Math.PI * 0.2 };
        this.bodyParts.hand_l = { x: -32, y: 68, rotation: 0 };
        
        // Legs standing - properly aligned
        this.bodyParts.hip_r = { x: 8, y: 80, rotation: Math.PI * 0.02 };
        this.bodyParts.knee_r = { x: 10, y: 112 + breathe, rotation: 0 };
        this.bodyParts.foot_r = { x: 12, y: 145, rotation: 0 };
        
        this.bodyParts.hip_l = { x: -8, y: 80, rotation: -Math.PI * 0.02 };
        this.bodyParts.knee_l = { x: -10, y: 112 + breathe, rotation: 0 };
        this.bodyParts.foot_l = { x: -12, y: 145, rotation: 0 };
        
        this.swordAngle = Math.PI * 0.3;
    }
    
    setWalkPose(walkCycle) {
        const legSwing = walkCycle * 20;
        
        // Core body with slight bob
        this.bodyParts.torso = { x: 0, y: 55, rotation: walkCycle * 0.03 };
        this.bodyParts.head = { x: 0, y: 20, rotation: 0 };
        
        // Arms swinging opposite to legs
        this.bodyParts.shoulder_r = { x: 18, y: 35, rotation: Math.PI * 0.1 - walkCycle * 0.15 };
        this.bodyParts.elbow_r = { x: 30 - walkCycle * 5, y: 55, rotation: Math.PI * 0.3 };
        this.bodyParts.hand_r = { x: 40 - walkCycle * 8, y: 70, rotation: Math.PI * 0.2 };
        
        this.bodyParts.shoulder_l = { x: -18, y: 35, rotation: -Math.PI * 0.1 + walkCycle * 0.15 };
        this.bodyParts.elbow_l = { x: -28 + walkCycle * 5, y: 52, rotation: -Math.PI * 0.2 };
        this.bodyParts.hand_l = { x: -32 + walkCycle * 8, y: 68, rotation: 0 };
        
        // Legs walking - proper stride
        this.bodyParts.hip_r = { x: 8 + legSwing * 0.4, y: 80, rotation: walkCycle * 0.35 };
        this.bodyParts.knee_r = { x: 10 + legSwing * 0.6, y: 112, rotation: Math.max(0, walkCycle) * 0.4 };
        this.bodyParts.foot_r = { x: 12 + legSwing * 0.5, y: 145, rotation: 0 };
        
        this.bodyParts.hip_l = { x: -8 - legSwing * 0.4, y: 80, rotation: -walkCycle * 0.35 };
        this.bodyParts.knee_l = { x: -10 - legSwing * 0.6, y: 112, rotation: Math.max(0, -walkCycle) * 0.4 };
        this.bodyParts.foot_l = { x: -12 - legSwing * 0.5, y: 145, rotation: 0 };
        
        this.swordAngle = Math.PI * 0.25;
    }
    
    setJumpPose() {
        // Dynamic jump pose based on phase
        this.bodyParts.torso = { x: 0, y: 55, rotation: this.jumpRotation };
        this.bodyParts.head = { x: 0, y: 20, rotation: this.jumpRotation * 0.5 };
        
        // Arms - spread during rise, come down during fall
        if (this.jumpPhase === 1) {
            // Rising - arms up
            this.bodyParts.shoulder_r = { x: 22, y: 32, rotation: -Math.PI * 0.4 };
            this.bodyParts.elbow_r = { x: 40, y: 20, rotation: -Math.PI * 0.2 };
            this.bodyParts.hand_r = { x: 55, y: 25, rotation: Math.PI * 0.3 };
            
            this.bodyParts.shoulder_l = { x: -22, y: 32, rotation: Math.PI * 0.3 };
            this.bodyParts.elbow_l = { x: -38, y: 40, rotation: Math.PI * 0.2 };
            this.bodyParts.hand_l = { x: -45, y: 55, rotation: 0 };
        } else {
            // Falling - arms forward for balance
            this.bodyParts.shoulder_r = { x: 18, y: 35, rotation: -Math.PI * 0.15 };
            this.bodyParts.elbow_r = { x: 35, y: 40, rotation: Math.PI * 0.1 };
            this.bodyParts.hand_r = { x: 48, y: 50, rotation: Math.PI * 0.3 };
            
            this.bodyParts.shoulder_l = { x: -18, y: 35, rotation: Math.PI * 0.2 };
            this.bodyParts.elbow_l = { x: -32, y: 50, rotation: Math.PI * 0.3 };
            this.bodyParts.hand_l = { x: -38, y: 65, rotation: 0 };
        }
        
        // Legs - tucked during rise, extended during fall
        if (this.jumpPhase === 1) {
            // Rising - legs tucked
            this.bodyParts.hip_r = { x: 12, y: 80, rotation: Math.PI * 0.4 };
            this.bodyParts.knee_r = { x: 22, y: 100, rotation: Math.PI * 0.6 };
            this.bodyParts.foot_r = { x: 15, y: 118, rotation: Math.PI * 0.3 };
            
            this.bodyParts.hip_l = { x: -10, y: 80, rotation: -Math.PI * 0.25 };
            this.bodyParts.knee_l = { x: -20, y: 102, rotation: -Math.PI * 0.35 };
            this.bodyParts.foot_l = { x: -25, y: 122, rotation: -Math.PI * 0.1 };
        } else {
            // Falling - legs extend for landing
            this.bodyParts.hip_r = { x: 10, y: 80, rotation: Math.PI * 0.15 };
            this.bodyParts.knee_r = { x: 14, y: 112, rotation: Math.PI * 0.1 };
            this.bodyParts.foot_r = { x: 16, y: 145, rotation: 0 };
            
            this.bodyParts.hip_l = { x: -10, y: 80, rotation: -Math.PI * 0.12 };
            this.bodyParts.knee_l = { x: -14, y: 112, rotation: -Math.PI * 0.08 };
            this.bodyParts.foot_l = { x: -16, y: 145, rotation: 0 };
        }
        
        this.swordAngle = this.jumpPhase === 1 ? -Math.PI * 0.4 : Math.PI * 0.1;
    }
    
    setBlockPose() {
        // Core body braced
        this.bodyParts.torso = { x: 0, y: 55, rotation: -0.1 };
        this.bodyParts.head = { x: -2, y: 22, rotation: -0.05 };
        
        // Arms crossed for defense
        this.bodyParts.shoulder_r = { x: 8, y: 35, rotation: -Math.PI * 0.4 };
        this.bodyParts.elbow_r = { x: 0, y: 25, rotation: -Math.PI * 0.6 };
        this.bodyParts.hand_r = { x: 12, y: 15, rotation: -Math.PI * 0.3 };
        
        this.bodyParts.shoulder_l = { x: -8, y: 35, rotation: Math.PI * 0.4 };
        this.bodyParts.elbow_l = { x: 2, y: 28, rotation: Math.PI * 0.5 };
        this.bodyParts.hand_l = { x: -8, y: 18, rotation: 0 };
        
        // Legs braced - wider stance
        this.bodyParts.hip_r = { x: 12, y: 80, rotation: Math.PI * 0.08 };
        this.bodyParts.knee_r = { x: 18, y: 112, rotation: Math.PI * 0.08 };
        this.bodyParts.foot_r = { x: 22, y: 145, rotation: 0 };
        
        this.bodyParts.hip_l = { x: -12, y: 80, rotation: -Math.PI * 0.08 };
        this.bodyParts.knee_l = { x: -18, y: 112, rotation: -Math.PI * 0.08 };
        this.bodyParts.foot_l = { x: -22, y: 145, rotation: 0 };
        
        this.swordAngle = -Math.PI * 0.6;
    }
    
    setSlashPose() {
        const progress = this.attackFrame / 20;
        
        // Core body
        this.bodyParts.torso = { x: 0, y: 55, rotation: progress < 0.6 ? -0.1 : 0.15 };
        this.bodyParts.head = { x: 0, y: 20, rotation: progress < 0.6 ? -0.05 : 0.1 };
        
        if (progress < 0.3) {
            // Wind up
            const t = progress / 0.3;
            this.bodyParts.shoulder_r = { x: 10 - t * 25, y: 32 - t * 8, rotation: -Math.PI * 0.3 - t * Math.PI * 0.4 };
            this.bodyParts.elbow_r = { x: 0 - t * 15, y: 20, rotation: -Math.PI * 0.4 };
            this.bodyParts.hand_r = { x: -8 - t * 8, y: 12, rotation: -Math.PI * 0.3 };
            this.swordAngle = -Math.PI * 0.7 - t * Math.PI * 0.3;
        } else if (progress < 0.6) {
            // Strike
            const t = (progress - 0.3) / 0.3;
            this.bodyParts.shoulder_r = { x: -15 + t * 45, y: 24 + t * 12, rotation: -Math.PI * 0.7 + t * Math.PI * 1.1 };
            this.bodyParts.elbow_r = { x: -15 + t * 55, y: 20 + t * 25, rotation: -Math.PI * 0.4 + t * Math.PI * 0.8 };
            this.bodyParts.hand_r = { x: -16 + t * 70, y: 12 + t * 45, rotation: t * Math.PI * 0.7 };
            this.swordAngle = -Math.PI + t * Math.PI * 1.4;
        } else {
            // Recovery
            const t = (progress - 0.6) / 0.4;
            this.bodyParts.shoulder_r = { x: 30 - t * 12, y: 36, rotation: Math.PI * 0.4 - t * 0.25 };
            this.bodyParts.elbow_r = { x: 40 - t * 8, y: 45, rotation: Math.PI * 0.4 - t * 0.1 };
            this.bodyParts.hand_r = { x: 54 - t * 12, y: 57, rotation: Math.PI * 0.7 - t * 0.5 };
            this.swordAngle = Math.PI * 0.4 - t * 0.1;
        }
        
        // Left arm follows
        this.bodyParts.shoulder_l = { x: -18, y: 35, rotation: -Math.PI * 0.1 };
        this.bodyParts.elbow_l = { x: -28, y: 50, rotation: -Math.PI * 0.15 };
        this.bodyParts.hand_l = { x: -32, y: 65, rotation: 0 };
        
        // Legs stance
        this.bodyParts.hip_r = { x: 12, y: 80, rotation: Math.PI * 0.12 };
        this.bodyParts.knee_r = { x: 18, y: 112, rotation: Math.PI * 0.08 };
        this.bodyParts.foot_r = { x: 22, y: 145, rotation: 0 };
        this.bodyParts.hip_l = { x: -10, y: 80, rotation: -Math.PI * 0.08 };
        this.bodyParts.knee_l = { x: -14, y: 112, rotation: 0 };
        this.bodyParts.foot_l = { x: -16, y: 145, rotation: 0 };
    }
    
    setPowerSlashPose() {
        const progress = this.attackFrame / 35;
        
        // Core body with rotation during attack
        const torsoRot = progress < 0.35 ? -progress * 0.8 : (progress < 0.55 ? -0.28 + (progress - 0.35) * 2.4 : 0.2 - (progress - 0.55) * 0.4);
        this.bodyParts.torso = { x: 0, y: 55, rotation: torsoRot };
        this.bodyParts.head = { x: 0, y: 20, rotation: torsoRot * 0.5 };
        
        // More dramatic wind up and strike
        if (progress < 0.35) {
            const t = progress / 0.35;
            this.bodyParts.shoulder_r = { x: 8 - t * 35, y: 30 - t * 15, rotation: -Math.PI * 0.4 - t * Math.PI * 0.5 };
            this.bodyParts.elbow_r = { x: -5 - t * 20, y: 18 - t * 8, rotation: -Math.PI * 0.5 };
            this.bodyParts.hand_r = { x: -15 - t * 12, y: 8, rotation: -Math.PI * 0.3 };
            this.swordAngle = -Math.PI * 0.9 - t * Math.PI * 0.35;
        } else if (progress < 0.55) {
            const t = (progress - 0.35) / 0.2;
            this.bodyParts.shoulder_r = { x: -27 + t * 65, y: 15 + t * 25, rotation: -Math.PI * 0.9 + t * Math.PI * 1.5 };
            this.bodyParts.elbow_r = { x: -25 + t * 75, y: 10 + t * 40, rotation: -Math.PI * 0.5 + t * Math.PI };
            this.bodyParts.hand_r = { x: -27 + t * 90, y: 8 + t * 55, rotation: -Math.PI * 0.3 + t * Math.PI * 1.2 };
            this.swordAngle = -Math.PI * 1.25 + t * Math.PI * 1.8;
        } else {
            const t = (progress - 0.55) / 0.45;
            this.bodyParts.shoulder_r = { x: 38 - t * 20, y: 40 - t * 5, rotation: Math.PI * 0.6 - t * 0.45 };
            this.bodyParts.elbow_r = { x: 50 - t * 18, y: 50 - t * 5, rotation: Math.PI * 0.5 - t * 0.2 };
            this.bodyParts.hand_r = { x: 63 - t * 21, y: 63 - t * 8, rotation: Math.PI * 0.9 - t * 0.7 };
            this.swordAngle = Math.PI * 0.55 - t * 0.25;
        }
        
        this.bodyParts.shoulder_l = { x: -20, y: 38, rotation: Math.PI * 0.15 };
        this.bodyParts.elbow_l = { x: -32, y: 52, rotation: Math.PI * 0.2 };
        this.bodyParts.hand_l = { x: -38, y: 68, rotation: 0 };
        
        // Wide stance
        this.bodyParts.hip_r = { x: 15, y: 80, rotation: Math.PI * 0.15 };
        this.bodyParts.knee_r = { x: 24, y: 112, rotation: Math.PI * 0.12 };
        this.bodyParts.foot_r = { x: 30, y: 145, rotation: 0 };
        this.bodyParts.hip_l = { x: -15, y: 80, rotation: -Math.PI * 0.12 };
        this.bodyParts.knee_l = { x: -22, y: 112, rotation: -Math.PI * 0.08 };
        this.bodyParts.foot_l = { x: -26, y: 145, rotation: 0 };
    }
    
    setFlyingKickPose() {
        const progress = this.attackFrame / 30;
        
        // Core body rotations
        const torsoRot = progress < 0.2 ? progress * 1 : (progress < 0.7 ? 0.2 + Math.sin((progress - 0.2) * Math.PI) * 0.1 : 0.3 - (progress - 0.7) * 1);
        this.bodyParts.torso = { x: 0, y: 55, rotation: torsoRot };
        this.bodyParts.head = { x: 0, y: 20, rotation: torsoRot * 0.6 };
        
        if (progress < 0.2) {
            // Jump preparation
            const t = progress / 0.2;
            this.bodyParts.hip_r = { x: 12 + t * 25, y: 80 - t * 15, rotation: Math.PI * 0.25 + t * Math.PI * 0.35 };
            this.bodyParts.knee_r = { x: 22 + t * 30, y: 90 - t * 5, rotation: Math.PI * 0.15 };
            this.bodyParts.foot_r = { x: 40 + t * 40, y: 95, rotation: Math.PI * 0.2 };
        } else if (progress < 0.7) {
            // Flying kick extended
            const t = (progress - 0.2) / 0.5;
            this.bodyParts.hip_r = { x: 37 + t * 15, y: 65, rotation: Math.PI * 0.6 };
            this.bodyParts.knee_r = { x: 55 + t * 12, y: 68, rotation: Math.PI * 0.08 };
            this.bodyParts.foot_r = { x: 85 + t * 8, y: 72, rotation: Math.PI * 0.35 };
        } else {
            // Landing
            const t = (progress - 0.7) / 0.3;
            this.bodyParts.hip_r = { x: 52 - t * 40, y: 65 + t * 15, rotation: Math.PI * 0.6 - t * Math.PI * 0.5 };
            this.bodyParts.knee_r = { x: 67 - t * 53, y: 68 + t * 44, rotation: Math.PI * 0.08 - t * 0.08 };
            this.bodyParts.foot_r = { x: 93 - t * 81, y: 72 + t * 73, rotation: Math.PI * 0.35 - t * 0.35 };
        }
        
        // Back leg tucked
        this.bodyParts.hip_l = { x: -12, y: 80, rotation: -Math.PI * 0.35 };
        this.bodyParts.knee_l = { x: -25, y: 78, rotation: -Math.PI * 0.5 };
        this.bodyParts.foot_l = { x: -22, y: 92, rotation: -Math.PI * 0.15 };
        
        // Arms for balance
        this.bodyParts.shoulder_r = { x: -8, y: 32, rotation: -Math.PI * 0.25 };
        this.bodyParts.elbow_r = { x: -22, y: 42, rotation: -Math.PI * 0.15 };
        this.bodyParts.hand_r = { x: -32, y: 55, rotation: 0 };
        this.bodyParts.shoulder_l = { x: -22, y: 35, rotation: Math.PI * 0.4 };
        this.bodyParts.elbow_l = { x: -38, y: 32, rotation: Math.PI * 0.25 };
        this.bodyParts.hand_l = { x: -48, y: 42, rotation: 0 };
        
        this.swordAngle = -Math.PI * 0.4;
    }
    
    setComboPose() {
        const progress = this.attackFrame / 25;
        const comboPhase = Math.floor(progress * 3) % 3;
        const phaseProgress = (progress * 3) % 1;
        
        // Core body with quick rotation for each phase
        const torsoRot = comboPhase === 0 ? phaseProgress * 0.15 : (comboPhase === 1 ? 0.15 - phaseProgress * 0.3 : -0.15 + phaseProgress * 0.15);
        this.bodyParts.torso = { x: 0, y: 55, rotation: torsoRot };
        this.bodyParts.head = { x: 0, y: 20, rotation: torsoRot * 0.6 };
        
        // Quick alternating strikes
        if (comboPhase === 0) {
            this.bodyParts.shoulder_r = { x: 18 + phaseProgress * 32, y: 32, rotation: Math.PI * phaseProgress * 0.7 };
            this.bodyParts.elbow_r = { x: 35 + phaseProgress * 22, y: 42, rotation: Math.PI * 0.25 };
            this.bodyParts.hand_r = { x: 48 + phaseProgress * 28, y: 52, rotation: Math.PI * 0.45 };
            this.swordAngle = Math.PI * 0.2 + phaseProgress * Math.PI * 0.35;
        } else if (comboPhase === 1) {
            this.bodyParts.shoulder_r = { x: 50 - phaseProgress * 25, y: 28 + phaseProgress * 12, rotation: Math.PI * 0.7 - phaseProgress * 0.4 };
            this.bodyParts.elbow_r = { x: 57 - phaseProgress * 15, y: 38 + phaseProgress * 16, rotation: Math.PI * 0.25 };
            this.bodyParts.hand_r = { x: 76 - phaseProgress * 24, y: 48 + phaseProgress * 12, rotation: Math.PI * 0.45 };
            this.swordAngle = Math.PI * 0.55 - phaseProgress * 0.25;
        } else {
            this.bodyParts.shoulder_r = { x: 25 + phaseProgress * 20, y: 40 - phaseProgress * 8, rotation: Math.PI * 0.3 + phaseProgress * 0.35 };
            this.bodyParts.elbow_r = { x: 42 + phaseProgress * 16, y: 54 - phaseProgress * 12, rotation: Math.PI * 0.25 };
            this.bodyParts.hand_r = { x: 52 + phaseProgress * 24, y: 60 - phaseProgress * 8, rotation: Math.PI * 0.45 };
            this.swordAngle = Math.PI * 0.3 + phaseProgress * 0.4;
        }
        
        this.bodyParts.shoulder_l = { x: -18, y: 35, rotation: -Math.PI * 0.1 };
        this.bodyParts.elbow_l = { x: -28, y: 50, rotation: -Math.PI * 0.15 };
        this.bodyParts.hand_l = { x: -32, y: 65, rotation: 0 };
        
        this.bodyParts.hip_r = { x: 10, y: 80, rotation: Math.PI * 0.08 };
        this.bodyParts.knee_r = { x: 14, y: 112, rotation: 0 };
        this.bodyParts.foot_r = { x: 16, y: 145, rotation: 0 };
        this.bodyParts.hip_l = { x: -10, y: 80, rotation: -Math.PI * 0.08 };
        this.bodyParts.knee_l = { x: -14, y: 112, rotation: 0 };
        this.bodyParts.foot_l = { x: -16, y: 145, rotation: 0 };
    }
    
    setUppercutPose() {
        const progress = this.attackFrame / 25;
        
        // Core body positioning
        const torsoRot = progress < 0.3 ? progress * 0.6 : (progress < 0.6 ? 0.18 - (progress - 0.3) * 1.2 : -0.18 + (progress - 0.6) * 0.45);
        this.bodyParts.torso = { x: 0, y: 55, rotation: torsoRot };
        this.bodyParts.head = { x: 0, y: 20, rotation: torsoRot * 0.7 };
        
        if (progress < 0.3) {
            // Crouch
            const t = progress / 0.3;
            this.bodyParts.shoulder_r = { x: 14 - t * 8, y: 40 + t * 12, rotation: Math.PI * 0.4 };
            this.bodyParts.elbow_r = { x: 24, y: 58 + t * 8, rotation: Math.PI * 0.7 };
            this.bodyParts.hand_r = { x: 20, y: 76 + t * 4, rotation: Math.PI * 0.4 };
            
            this.bodyParts.hip_r = { x: 10, y: 80 + t * 8, rotation: Math.PI * 0.15 + t * 0.15 };
            this.bodyParts.knee_r = { x: 16, y: 112 + t * 8, rotation: Math.PI * 0.25 };
            this.bodyParts.foot_r = { x: 22, y: 145, rotation: 0 };
        } else if (progress < 0.6) {
            // Rising strike
            const t = (progress - 0.3) / 0.3;
            this.bodyParts.shoulder_r = { x: 6 + t * 22, y: 52 - t * 42, rotation: Math.PI * 0.4 - t * Math.PI * 0.9 };
            this.bodyParts.elbow_r = { x: 24 + t * 16, y: 66 - t * 58, rotation: Math.PI * 0.7 - t * Math.PI * 0.4 };
            this.bodyParts.hand_r = { x: 20 + t * 32, y: 80 - t * 76, rotation: Math.PI * 0.4 - t * Math.PI * 0.7 };
            
            this.bodyParts.hip_r = { x: 10, y: 88 - t * 12, rotation: Math.PI * 0.3 - t * 0.22 };
            this.bodyParts.knee_r = { x: 16, y: 120 - t * 12, rotation: Math.PI * 0.25 - t * 0.15 };
            this.bodyParts.foot_r = { x: 22, y: 145 - t * 4, rotation: 0 };
        } else {
            // Recovery
            const t = (progress - 0.6) / 0.4;
            this.bodyParts.shoulder_r = { x: 28 - t * 10, y: 10 + t * 26, rotation: -Math.PI * 0.5 + t * Math.PI * 0.55 };
            this.bodyParts.elbow_r = { x: 40 - t * 8, y: 8 + t * 38, rotation: Math.PI * 0.3 };
            this.bodyParts.hand_r = { x: 52 - t * 10, y: 4 + t * 58, rotation: -Math.PI * 0.3 + t * Math.PI * 0.45 };
            
            this.bodyParts.hip_r = { x: 10, y: 76 + t * 4, rotation: Math.PI * 0.08 };
            this.bodyParts.knee_r = { x: 16, y: 108 + t * 4, rotation: Math.PI * 0.1 };
            this.bodyParts.foot_r = { x: 22, y: 141 + t * 4, rotation: 0 };
        }
        
        this.bodyParts.shoulder_l = { x: -18, y: 40, rotation: Math.PI * 0.15 };
        this.bodyParts.elbow_l = { x: -28, y: 54, rotation: Math.PI * 0.2 };
        this.bodyParts.hand_l = { x: -32, y: 68, rotation: 0 };
        this.bodyParts.hip_l = { x: -10, y: 80, rotation: -Math.PI * 0.08 };
        this.bodyParts.knee_l = { x: -16, y: 112, rotation: 0 };
        this.bodyParts.foot_l = { x: -20, y: 145, rotation: 0 };
        
        this.swordAngle = progress < 0.6 ? -Math.PI * 0.25 + progress * Math.PI * 0.7 : Math.PI * 0.17;
    }
    
    setKOStrikePose() {
        const progress = this.attackFrame / 45;
        
        // Core body - dramatic rotation
        const torsoRot = progress < 0.4 ? -progress * 1 : (progress < 0.55 ? -0.4 + (progress - 0.4) * 5.3 : 0.4 - (progress - 0.55) * 0.9);
        this.bodyParts.torso = { x: 0, y: 55, rotation: torsoRot };
        this.bodyParts.head = { x: 0, y: 20, rotation: torsoRot * 0.5 };
        
        if (progress < 0.4) {
            // Long wind up
            const t = progress / 0.4;
            this.bodyParts.shoulder_r = { x: 10 - t * 40, y: 32 - t * 22, rotation: -Math.PI * 0.3 - t * Math.PI * 0.7 };
            this.bodyParts.elbow_r = { x: -2 - t * 24, y: 20 - t * 18, rotation: -Math.PI * 0.45 - t * 0.25 };
            this.bodyParts.hand_r = { x: -14 - t * 16, y: 8 - t * 12, rotation: -Math.PI * 0.3 - t * 0.35 };
            
            this.bodyParts.hip_r = { x: 12 - t * 8, y: 80, rotation: Math.PI * 0.08 + t * 0.15 };
            this.bodyParts.knee_r = { x: 18 - t * 8, y: 112, rotation: Math.PI * 0.15 };
            this.bodyParts.foot_r = { x: 22 - t * 4, y: 145, rotation: 0 };
            
            this.swordAngle = -Math.PI * 0.7 - t * Math.PI * 0.45;
        } else if (progress < 0.55) {
            // Devastating strike
            const t = (progress - 0.4) / 0.15;
            this.bodyParts.shoulder_r = { x: -30 + t * 85, y: 10 + t * 38, rotation: -Math.PI + t * Math.PI * 1.8 };
            this.bodyParts.elbow_r = { x: -26 + t * 95, y: 2 + t * 52, rotation: -Math.PI * 0.7 + t * Math.PI * 1.3 };
            this.bodyParts.hand_r = { x: -30 + t * 108, y: -4 + t * 65, rotation: -Math.PI * 0.65 + t * Math.PI * 1.6 };
            
            this.bodyParts.hip_r = { x: 4 + t * 20, y: 80, rotation: Math.PI * 0.23 - t * 0.08 };
            this.bodyParts.knee_r = { x: 10 + t * 16, y: 112, rotation: Math.PI * 0.15 - t * 0.08 };
            this.bodyParts.foot_r = { x: 18 + t * 12, y: 145, rotation: 0 };
            
            this.swordAngle = -Math.PI * 1.15 + t * Math.PI * 1.95;
        } else {
            // Long recovery
            const t = (progress - 0.55) / 0.45;
            this.bodyParts.shoulder_r = { x: 55 - t * 37, y: 48 - t * 12, rotation: Math.PI * 0.8 - t * Math.PI * 0.7 };
            this.bodyParts.elbow_r = { x: 69 - t * 37, y: 54 - t * 10, rotation: Math.PI * 0.6 - t * 0.3 };
            this.bodyParts.hand_r = { x: 78 - t * 36, y: 61 - t * 4, rotation: Math.PI * 0.95 - t * Math.PI * 0.75 };
            
            this.bodyParts.hip_r = { x: 24 - t * 14, y: 80, rotation: Math.PI * 0.15 - t * 0.08 };
            this.bodyParts.knee_r = { x: 26 - t * 12, y: 112, rotation: Math.PI * 0.07 };
            this.bodyParts.foot_r = { x: 30 - t * 16, y: 145, rotation: 0 };
            
            this.swordAngle = Math.PI * 0.8 - t * Math.PI * 0.5;
        }
        
        this.bodyParts.shoulder_l = { x: -20, y: 38, rotation: Math.PI * 0.25 };
        this.bodyParts.elbow_l = { x: -32, y: 54, rotation: Math.PI * 0.35 };
        this.bodyParts.hand_l = { x: -40, y: 68, rotation: 0 };
        this.bodyParts.hip_l = { x: -12, y: 80, rotation: -Math.PI * 0.12 };
        this.bodyParts.knee_l = { x: -18, y: 112, rotation: -Math.PI * 0.08 };
        this.bodyParts.foot_l = { x: -24, y: 145, rotation: 0 };
    }
    
    setStunnedPose() {
        const wobble = Math.sin(this.animationTimer * 0.3) * 4;
        
        this.bodyParts.torso = { x: wobble * 0.3, y: 55, rotation: wobble * 0.02 };
        this.bodyParts.head = { x: wobble * 0.4, y: 22, rotation: wobble * 0.04 };
        
        this.bodyParts.shoulder_r = { x: 14 + wobble, y: 40, rotation: Math.PI * 0.18 };
        this.bodyParts.elbow_r = { x: 26 + wobble, y: 58, rotation: Math.PI * 0.35 };
        this.bodyParts.hand_r = { x: 30 + wobble, y: 76, rotation: Math.PI * 0.25 };
        
        this.bodyParts.shoulder_l = { x: -14 + wobble, y: 40, rotation: -Math.PI * 0.18 };
        this.bodyParts.elbow_l = { x: -26 + wobble, y: 58, rotation: -Math.PI * 0.35 };
        this.bodyParts.hand_l = { x: -30 + wobble, y: 76, rotation: 0 };
        
        this.bodyParts.hip_r = { x: 10 + wobble * 0.4, y: 82, rotation: Math.PI * 0.08 };
        this.bodyParts.knee_r = { x: 16, y: 114, rotation: Math.PI * 0.12 };
        this.bodyParts.foot_r = { x: 20, y: 145, rotation: 0 };
        this.bodyParts.hip_l = { x: -10 + wobble * 0.4, y: 82, rotation: -Math.PI * 0.08 };
        this.bodyParts.knee_l = { x: -16, y: 114, rotation: -Math.PI * 0.12 };
        this.bodyParts.foot_l = { x: -20, y: 145, rotation: 0 };
        
        this.swordAngle = Math.PI * 0.45 + wobble * 0.015;
    }
    
    setSolarBeamPose() {
        const progress = this.attackFrame / 90;
        const chargeWobble = Math.sin(this.attackFrame * 0.5) * 3;
        
        if (progress < 0.3) {
            // Charging pose - hands together, gathering energy
            const t = progress / 0.3;
            this.bodyParts.torso = { x: 0, y: 55, rotation: -t * 0.15 };
            this.bodyParts.head = { x: 0, y: 20, rotation: -t * 0.08 };
            
            // Both hands coming together at the side
            this.bodyParts.shoulder_r = { x: -4, y: 35, rotation: -Math.PI * 0.25 - t * Math.PI * 0.18 };
            this.bodyParts.elbow_r = { x: -12 - t * 8, y: 50, rotation: -Math.PI * 0.45 };
            this.bodyParts.hand_r = { x: -18 - t * 4, y: 62 + chargeWobble, rotation: -Math.PI * 0.25 };
            
            this.bodyParts.shoulder_l = { x: -8, y: 38, rotation: Math.PI * 0.18 + t * Math.PI * 0.25 };
            this.bodyParts.elbow_l = { x: -22 - t * 4, y: 54, rotation: Math.PI * 0.35 };
            this.bodyParts.hand_l = { x: -22 - t * 2, y: 66 + chargeWobble, rotation: 0 };
        } else if (progress < 0.4) {
            // Push forward pose
            const t = (progress - 0.3) / 0.1;
            this.bodyParts.torso = { x: 0, y: 55, rotation: -0.15 + t * 0.35 };
            this.bodyParts.head = { x: 0, y: 20, rotation: -0.08 + t * 0.15 };
            
            this.bodyParts.shoulder_r = { x: -4 + t * 35, y: 35, rotation: -Math.PI * 0.43 + t * Math.PI * 0.6 };
            this.bodyParts.elbow_r = { x: -20 + t * 58, y: 50, rotation: -Math.PI * 0.45 + t * Math.PI * 0.45 };
            this.bodyParts.hand_r = { x: -22 + t * 68, y: 62, rotation: t * Math.PI * 0.25 };
            
            this.bodyParts.shoulder_l = { x: -8 + t * 30, y: 38, rotation: Math.PI * 0.43 - t * Math.PI * 0.25 };
            this.bodyParts.elbow_l = { x: -26 + t * 54, y: 54, rotation: Math.PI * 0.35 - t * Math.PI * 0.25 };
            this.bodyParts.hand_l = { x: -24 + t * 62, y: 66, rotation: 0 };
        } else {
            // Firing pose - arms extended forward
            const fireWobble = Math.sin(this.attackFrame * 0.8) * 2;
            this.bodyParts.torso = { x: 0, y: 55, rotation: 0.2 };
            this.bodyParts.head = { x: 0, y: 20, rotation: 0.07 };
            
            this.bodyParts.shoulder_r = { x: 31, y: 35 + fireWobble, rotation: Math.PI * 0.17 };
            this.bodyParts.elbow_r = { x: 48, y: 50 + fireWobble, rotation: 0 };
            this.bodyParts.hand_r = { x: 62, y: 58 + fireWobble, rotation: Math.PI * 0.25 };
            
            this.bodyParts.shoulder_l = { x: 26, y: 40 + fireWobble, rotation: Math.PI * 0.12 };
            this.bodyParts.elbow_l = { x: 42, y: 54 + fireWobble, rotation: Math.PI * 0.08 };
            this.bodyParts.hand_l = { x: 58, y: 60 + fireWobble, rotation: 0 };
        }
        
        // Wide power stance
        this.bodyParts.hip_r = { x: 16, y: 80, rotation: Math.PI * 0.2 };
        this.bodyParts.knee_r = { x: 28, y: 112, rotation: Math.PI * 0.16 };
        this.bodyParts.foot_r = { x: 38, y: 145, rotation: 0 };
        this.bodyParts.hip_l = { x: -14, y: 80, rotation: -Math.PI * 0.16 };
        this.bodyParts.knee_l = { x: -25, y: 112, rotation: -Math.PI * 0.12 };
        this.bodyParts.foot_l = { x: -32, y: 145, rotation: 0 };
        
        this.swordAngle = Math.PI * 0.75; // Sword aside during beam
    }
    
    setEarthquakePose() {
        const stats = this.attackStats[AttackType.EARTHQUAKE];
        const progress = this.attackFrame / stats.duration;
        
        if (progress < 0.20) {
            // Phase 1: Jumping up
            const t = progress / 0.20;
            const jumpHeight = Math.sin(t * Math.PI * 0.5) * 80;
            
            this.bodyParts.torso = { x: 0, y: 55 - jumpHeight, rotation: -0.1 };
            this.bodyParts.head = { x: 0, y: 20 - jumpHeight, rotation: -0.15 };
            
            // Arms raised
            this.bodyParts.shoulder_r = { x: 20, y: 30 - jumpHeight, rotation: -Math.PI * 0.5 };
            this.bodyParts.elbow_r = { x: 25, y: 10 - jumpHeight, rotation: -Math.PI * 0.3 };
            this.bodyParts.hand_r = { x: 30, y: -10 - jumpHeight, rotation: 0 };
            
            this.bodyParts.shoulder_l = { x: -20, y: 30 - jumpHeight, rotation: Math.PI * 0.5 };
            this.bodyParts.elbow_l = { x: -25, y: 10 - jumpHeight, rotation: Math.PI * 0.3 };
            this.bodyParts.hand_l = { x: -30, y: -10 - jumpHeight, rotation: 0 };
            
            // Legs tucked
            this.bodyParts.hip_r = { x: 10, y: 80 - jumpHeight, rotation: -Math.PI * 0.3 };
            this.bodyParts.knee_r = { x: 20, y: 95 - jumpHeight, rotation: Math.PI * 0.5 };
            this.bodyParts.foot_r = { x: 15, y: 110 - jumpHeight, rotation: 0 };
            
            this.bodyParts.hip_l = { x: -10, y: 80 - jumpHeight, rotation: Math.PI * 0.3 };
            this.bodyParts.knee_l = { x: -20, y: 95 - jumpHeight, rotation: -Math.PI * 0.5 };
            this.bodyParts.foot_l = { x: -15, y: 110 - jumpHeight, rotation: 0 };
            
            this.swordAngle = -Math.PI * 0.5;
        } else if (progress < 0.30) {
            // Phase 2: Slamming down
            const t = (progress - 0.20) / 0.10;
            const slamY = 80 * (1 - t);
            
            this.bodyParts.torso = { x: 0, y: 55 - slamY, rotation: 0.2 };
            this.bodyParts.head = { x: 0, y: 20 - slamY, rotation: 0.25 };
            
            // Arms slamming down
            this.bodyParts.shoulder_r = { x: 20, y: 30 - slamY, rotation: Math.PI * 0.4 };
            this.bodyParts.elbow_r = { x: 35, y: 60 - slamY, rotation: Math.PI * 0.3 };
            this.bodyParts.hand_r = { x: 40, y: 90 - slamY, rotation: Math.PI * 0.5 };
            
            this.bodyParts.shoulder_l = { x: -20, y: 30 - slamY, rotation: -Math.PI * 0.4 };
            this.bodyParts.elbow_l = { x: -35, y: 60 - slamY, rotation: -Math.PI * 0.3 };
            this.bodyParts.hand_l = { x: -40, y: 90 - slamY, rotation: -Math.PI * 0.5 };
            
            // Legs extending
            this.bodyParts.hip_r = { x: 15, y: 80 - slamY, rotation: Math.PI * 0.15 };
            this.bodyParts.knee_r = { x: 25, y: 115 - slamY, rotation: Math.PI * 0.1 };
            this.bodyParts.foot_r = { x: 30, y: 145 - slamY, rotation: 0 };
            
            this.bodyParts.hip_l = { x: -15, y: 80 - slamY, rotation: -Math.PI * 0.15 };
            this.bodyParts.knee_l = { x: -25, y: 115 - slamY, rotation: -Math.PI * 0.1 };
            this.bodyParts.foot_l = { x: -30, y: 145 - slamY, rotation: 0 };
            
            this.swordAngle = Math.PI * 0.5;
        } else {
            // Phase 3: Ground slam - shaking
            const shakeIntensity = Math.max(0, 1 - (progress - 0.30) / 0.70);
            const shake = Math.sin(this.attackFrame * 1.5) * 4 * shakeIntensity;
            
            this.bodyParts.torso = { x: shake, y: 60, rotation: 0.15 };
            this.bodyParts.head = { x: shake, y: 25, rotation: 0.1 };
            
            // Arms on ground
            this.bodyParts.shoulder_r = { x: 25 + shake, y: 45, rotation: Math.PI * 0.6 };
            this.bodyParts.elbow_r = { x: 45 + shake, y: 75, rotation: Math.PI * 0.4 };
            this.bodyParts.hand_r = { x: 55 + shake, y: 100, rotation: Math.PI * 0.5 };
            
            this.bodyParts.shoulder_l = { x: -25 + shake, y: 45, rotation: -Math.PI * 0.6 };
            this.bodyParts.elbow_l = { x: -45 + shake, y: 75, rotation: -Math.PI * 0.4 };
            this.bodyParts.hand_l = { x: -55 + shake, y: 100, rotation: -Math.PI * 0.5 };
            
            // Wide stance
            this.bodyParts.hip_r = { x: 18 + shake, y: 85, rotation: Math.PI * 0.25 };
            this.bodyParts.knee_r = { x: 35 + shake, y: 115, rotation: Math.PI * 0.2 };
            this.bodyParts.foot_r = { x: 45 + shake, y: 145, rotation: 0 };
            
            this.bodyParts.hip_l = { x: -18 + shake, y: 85, rotation: -Math.PI * 0.25 };
            this.bodyParts.knee_l = { x: -35 + shake, y: 115, rotation: -Math.PI * 0.2 };
            this.bodyParts.foot_l = { x: -45 + shake, y: 145, rotation: 0 };
            
            this.swordAngle = Math.PI * 0.8;
            this.earthquakeShakeIntensity = shakeIntensity;
        }
    }
    
    attack(type = AttackType.SLASH) {
        if (this.attackCooldown > 0 || this.isAttacking || this.isBlocking || this.stunned > 0) return false;
        
        // Solar beam requires full boost
        if (type === AttackType.SOLAR_BEAM) {
            if (this.boostMeter < this.maxBoost) return false;
            if (this.characterType !== CharacterType.SOLAR) return false;
            this.boostMeter = 0; // Use up the boost
        }
        
        // Earthquake requires full boost
        if (type === AttackType.EARTHQUAKE) {
            if (this.boostMeter < this.maxBoost) return false;
            if (this.characterType !== CharacterType.EARTH) return false;
            this.boostMeter = 0; // Use up the boost
            this.earthquakePhase = 1; // Start jumping
            this.velocityY = -20; // High jump
        }
        
        this.isAttacking = true;
        this.currentAttack = type;
        this.attackFrame = 0;
        this.canHit = true;
        
        // Flying kick requires jump
        if (type === AttackType.FLYING_KICK && this.isGrounded) {
            this.velocityY = this.jumpForce * 0.7;
        }
        
        return true;
    }
    
    addBoost(amount) {
        // Both player and enemy can gain boost now
        this.boostMeter = Math.min(this.maxBoost, this.boostMeter + amount);
    }
    
    checkHit(opponent) {
        if (!this.isAttacking) return null;
        
        const stats = this.attackStats[this.currentAttack];
        if (!stats) return null;
        
        // Solar beam and earthquake do continuous damage (resets canHit every few frames)
        const isSolarBeam = this.currentAttack === AttackType.SOLAR_BEAM;
        const isEarthquake = this.currentAttack === AttackType.EARTHQUAKE;
        if ((isSolarBeam || isEarthquake) && this.attackFrame % 10 === 0) {
            this.canHit = true;
        }
        
        if (!this.canHit) return null;
        
        // Check if in attack damage window
        let hitWindowStart = stats.duration * 0.3;
        let hitWindowEnd = stats.duration * 0.65;
        
        // Solar beam has a longer hit window
        if (isSolarBeam) {
            hitWindowStart = stats.duration * 0.15;
            hitWindowEnd = stats.duration * 0.85;
        }
        
        // Earthquake hits during ground slam phase
        if (isEarthquake) {
            hitWindowStart = stats.duration * 0.25;
            hitWindowEnd = stats.duration * 0.85;
        }
        
        if (this.attackFrame < hitWindowStart || this.attackFrame > hitWindowEnd) return null;
        
        // Check collision
        const atkBox = this.attackBox;
        const oppBox = {
            x: opponent.x,
            y: opponent.y,
            width: opponent.width,
            height: opponent.height
        };
        
        if (this.boxCollision(atkBox, oppBox)) {
            this.canHit = false;
            
            // Solar beam and earthquake do smaller damage per tick but hits multiple times
            let damage = (isSolarBeam || isEarthquake) ? 8 : stats.damage;
            let blocked = false;
            let isKO = this.currentAttack === AttackType.KO_STRIKE;
            let isFlyingKick = this.currentAttack === AttackType.FLYING_KICK;
            
            // Check blocking - Solar beam and Earthquake CANNOT be blocked
            if (opponent.isBlocking && !isKO && !isSolarBeam && !isEarthquake) {
                damage = Math.floor(damage * 0.15);
                blocked = true;
            } else if (opponent.isBlocking && isKO) {
                damage = Math.floor(damage * 0.4);
                blocked = true;
            }
            
            // Randomness (less for special attacks)
            if (!isSolarBeam && !isEarthquake) {
                damage += Math.floor(Math.random() * 5) - 2;
            }
            damage = Math.max(1, damage);
            
            return { 
                damage, 
                blocked, 
                attackType: this.currentAttack,
                isKO,
                isFlyingKick,
                isSolarBeam,
                isEarthquake
            };
        }
        
        return null;
    }
    
    takeDamage(damage, fromRight, isKO = false, knockbackMultiplier = 1) {
        this.health = Math.max(0, this.health - damage);
        this.hitFlash = 12;
        this.knockback = (fromRight ? -18 : 18) * knockbackMultiplier;
        
        if (isKO) {
            this.knockback *= 1.5;
            this.stunned = 30;
        }
        
        if (!this.isGrounded) {
            this.knockback *= 0.6;
            this.velocityY = Math.min(this.velocityY, -5);
        }
    }
    
    boxCollision(box1, box2) {
        return box1.x < box2.x + box2.width &&
               box1.x + box1.width > box2.x &&
               box1.y < box2.y + box2.height &&
               box1.y + box1.height > box2.y;
    }
    
    draw() {
        ctx.save();
        
        let baseX = this.x;
        
        if (!this.facingRight) {
            ctx.translate(this.x + this.width, 0);
            ctx.scale(-1, 1);
            baseX = 0;
        }
        
        // Draw simple ground shadow (no glow)
        this.drawGroundShadow(baseX);
        
        // Apply hit flash
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.7 + Math.sin(this.hitFlash * 0.8) * 0.3;
        }
        
        // Draw the fighter body - classic samurai style
        this.drawBody(baseX);
        
        // Draw traditional hair style
        this.drawHair(baseX);
        
        // Draw katana
        this.drawSword(baseX);
        
        // Draw attack effects
        if (this.isAttacking) {
            this.drawAttackEffect(baseX);
        }
        
        // Draw solar beam
        if (this.currentAttack === AttackType.SOLAR_BEAM && this.attackFrame > 35) {
            this.drawSolarBeamEffect(baseX);
        }
        
        ctx.restore();
    }
    
    drawGroundShadow(baseX) {
        const groundY = this.groundY + this.height;
        const shadowWidth = 70;
        const gradient = ctx.createRadialGradient(
            baseX + this.width / 2, groundY,
            0,
            baseX + this.width / 2, groundY,
            shadowWidth
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(baseX - 30, groundY - 10, this.width + 60, 25);
    }
    
    drawHair(baseX) {
        const centerX = baseX + this.width / 2;
        const baseY = this.y;
        const bp = this.bodyParts;
        
        const headX = centerX + bp.head.x;
        const headY = baseY + bp.head.y;
        
        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(bp.head.rotation);
        
        const hairColor = this.hitFlash > 0 ? '#ffffff' : this.shadowColor;
        
        // Traditional samurai topknot (chonmage style)
        ctx.fillStyle = hairColor;
        
        // Base hair on head
        ctx.beginPath();
        ctx.ellipse(0, -14, 14, 8, 0, Math.PI, 0);
        ctx.fill();
        
        // Topknot bun
        ctx.beginPath();
        ctx.ellipse(0, -24, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Hair tie
        ctx.fillStyle = this.accentColor;
        ctx.fillRect(-3, -20, 6, 3);
        
        // Some loose strands for movement
        ctx.strokeStyle = hairColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        const windOffset = this.velocityX * 0.2;
        const waveOffset = Math.sin(this.animationTimer * 0.1) * 2;
        
        // Side strands
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.quadraticCurveTo(-14 + windOffset, -5 + waveOffset, -12 + windOffset, 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(10, -12);
        ctx.quadraticCurveTo(14 + windOffset, -5 + waveOffset, 12 + windOffset, 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawBody(baseX) {
        const centerX = baseX + this.width / 2;
        const baseY = this.y;
        
        // Draw body parts - classic samurai silhouette
        const bp = this.bodyParts;
        const bodyColor = this.hitFlash > 0 ? '#ffffff' : this.shadowColor;
        const clothDetail = this.accentColor;
        
        // Draw limbs first (behind body)
        // Left arm (back)
        this.drawLimb(centerX, baseY, bp.shoulder_l, bp.elbow_l, bp.hand_l, 8);
        
        // Left leg (back) - with hakama
        this.drawHakamaLeg(centerX, baseY, bp.hip_l, bp.knee_l, bp.foot_l, true);
        
        // Right leg (front) - with hakama
        this.drawHakamaLeg(centerX, baseY, bp.hip_r, bp.knee_r, bp.foot_r, false);
        
        // Torso - Gi (kimono top)
        ctx.save();
        ctx.translate(centerX + bp.torso.x, baseY + bp.torso.y);
        ctx.rotate(bp.torso.rotation);
        
        // Main gi shape
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-20, -28);
        ctx.lineTo(-24, 0);
        ctx.lineTo(-18, 32);
        ctx.lineTo(18, 32);
        ctx.lineTo(24, 0);
        ctx.lineTo(20, -28);
        ctx.closePath();
        ctx.fill();
        
        // Gi collar - V shape
        ctx.strokeStyle = clothDetail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, -25);
        ctx.lineTo(0, 5);
        ctx.lineTo(12, -25);
        ctx.stroke();
        
        // Obi (belt)
        ctx.fillStyle = clothDetail;
        ctx.fillRect(-20, 15, 40, 12);
        
        ctx.restore();
        
        // Right arm (front, sword arm)
        this.drawLimb(centerX, baseY, bp.shoulder_r, bp.elbow_r, bp.hand_r, 9);
        
        // Head
        ctx.save();
        ctx.translate(centerX + bp.head.x, baseY + bp.head.y);
        ctx.rotate(bp.head.rotation);
        
        // Head shape
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Simple face features - subtle
        ctx.fillStyle = clothDetail;
        // Eyes - small slits
        ctx.fillRect(-8, -4, 5, 2);
        ctx.fillRect(3, -4, 5, 2);
        
        ctx.restore();
    }
    
    drawLimb(centerX, baseY, joint1, joint2, joint3, thickness) {
        const x1 = centerX + joint1.x;
        const y1 = baseY + joint1.y;
        const x2 = centerX + joint2.x;
        const y2 = baseY + joint2.y;
        const x3 = centerX + joint3.x;
        const y3 = baseY + joint3.y;
        
        const bodyColor = this.hitFlash > 0 ? '#ffffff' : this.shadowColor;
        
        // Main limb
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.stroke();
        
        // Joint circle
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(x2, y2, thickness / 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawHakamaLeg(centerX, baseY, hip, knee, foot, isBack) {
        const x1 = centerX + hip.x;
        const y1 = baseY + hip.y;
        const x2 = centerX + knee.x;
        const y2 = baseY + knee.y;
        const x3 = centerX + foot.x;
        const y3 = baseY + foot.y;
        
        const bodyColor = this.hitFlash > 0 ? '#ffffff' : this.shadowColor;
        const thickness = isBack ? 12 : 14;
        
        // Hakama style - wide at top, narrow at bottom
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(x1 - 8, y1);
        ctx.lineTo(x1 + 8, y1);
        ctx.quadraticCurveTo(x2 + 6, y2, x2 + 4, y2);
        ctx.lineTo(x2 - 4, y2);
        ctx.quadraticCurveTo(x2 - 6, y2, x1 - 8, y1);
        ctx.fill();
        
        // Lower leg
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = thickness - 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.stroke();
        
        // Foot
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(x3, y3, 8, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSword(baseX) {
        const centerX = baseX + this.width / 2;
        const baseY = this.y;
        const bp = this.bodyParts;
        
        const handX = centerX + bp.hand_r.x;
        const handY = baseY + bp.hand_r.y;
        
        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(this.swordAngle + bp.hand_r.rotation);
        
        // Classic katana - no glow
        const bladeColor = this.hitFlash > 0 ? '#ffffff' : this.swordColor;
        
        // Blade shape - curved katana
        ctx.fillStyle = bladeColor;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.quadraticCurveTo(this.swordLength * 0.4, -5, this.swordLength - 10, -3);
        ctx.lineTo(this.swordLength, 0);
        ctx.lineTo(this.swordLength - 10, 3);
        ctx.quadraticCurveTo(this.swordLength * 0.4, 4, 0, 4);
        ctx.closePath();
        ctx.fill();
        
        // Blade edge highlight (sharp edge)
        ctx.strokeStyle = this.swordEdge;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(5, -3);
        ctx.quadraticCurveTo(this.swordLength * 0.5, -4, this.swordLength - 5, 0);
        ctx.stroke();
        
        // Tsuba (guard) - circular
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.ellipse(-2, 0, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tsuka (handle)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-22, -4, 18, 8);
        
        // Handle wrap (tsuka-ito) - diamond pattern
        ctx.fillStyle = this.accentColor;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-20 + i * 4, -3, 2, 6);
        }
        
        // Kashira (pommel)
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.ellipse(-22, 0, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawAttackEffect(baseX) {
        const stats = this.attackStats[this.currentAttack];
        if (!stats) return;
        
        const progress = this.attackFrame / stats.duration;
        
        // Solar beam shows effect for most of the attack (10%-90%)
        let effectStart = 0.25;
        let effectEnd = 0.75;
        if (this.currentAttack === AttackType.SOLAR_BEAM) {
            effectStart = 0.10;
            effectEnd = 0.90;
        }
        
        if (progress < effectStart || progress > effectEnd) return;
        
        const effectAlpha = Math.sin((progress - effectStart) / (effectEnd - effectStart) * Math.PI);
        const centerX = baseX + this.width / 2;
        
        ctx.save();
        
        switch (this.currentAttack) {
            case AttackType.SLASH:
            case AttackType.COMBO:
                this.drawSlashEffect(centerX, effectAlpha);
                break;
            case AttackType.POWER_SLASH:
            case AttackType.KO_STRIKE:
                this.drawPowerSlashEffect(centerX, effectAlpha, this.currentAttack === AttackType.KO_STRIKE);
                break;
            case AttackType.FLYING_KICK:
                this.drawKickEffect(centerX, effectAlpha);
                break;
            case AttackType.UPPERCUT:
                this.drawUppercutEffect(centerX, effectAlpha);
                break;
            case AttackType.SOLAR_BEAM:
                this.drawSolarBeamEffect(centerX, effectAlpha);
                break;
            case AttackType.EARTHQUAKE:
                this.drawEarthquakeEffect(centerX, effectAlpha);
                break;
        }
        
        ctx.restore();
    }
    
    drawSlashEffect(centerX, alpha) {
        // Classic white slash trail
        const color = `rgba(255, 255, 255, ${alpha * 0.7})`;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // Arc slash
        ctx.beginPath();
        ctx.arc(centerX + 50, this.y + 60, 55, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        
        // Secondary trail
        ctx.globalAlpha = alpha * 0.4;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(centerX + 50, this.y + 60, 50, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    drawPowerSlashEffect(centerX, alpha, isKO) {
        // Classic white power slash
        const color = `rgba(255, 255, 255, ${alpha * 0.8})`;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = isKO ? 5 : 4;
        ctx.lineCap = 'round';
        
        // Large arc
        ctx.beginPath();
        ctx.arc(centerX + 60, this.y + 50, isKO ? 80 : 70, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        
        // Speed lines
        ctx.lineWidth = 2;
        for (let i = 0; i < (isKO ? 6 : 4); i++) {
            ctx.globalAlpha = alpha * (1 - i * 0.15);
            ctx.beginPath();
            ctx.moveTo(centerX + 20, this.y + 20 + i * 20);
            ctx.lineTo(centerX + 90 + Math.random() * 20, this.y + 18 + i * 20);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    
    drawKickEffect(centerX, alpha) {
        const color = `rgba(255, 255, 255, ${alpha * 0.6})`;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        
        // Motion blur
        for (let i = 0; i < 4; i++) {
            ctx.globalAlpha = alpha * (1 - i * 0.2);
            ctx.beginPath();
            ctx.moveTo(centerX - 20 - i * 12, this.y + 70);
            ctx.lineTo(centerX + 50, this.y + 65);
            ctx.stroke();
        }
        
        // Impact burst
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(centerX + 70, this.y + 70, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }
    
    drawUppercutEffect(centerX, alpha) {
        const color = `rgba(255, 255, 255, ${alpha * 0.7})`;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        
        // Upward arc
        ctx.beginPath();
        ctx.arc(centerX + 30, this.y + 80, 50, -Math.PI, -Math.PI / 4);
        ctx.stroke();
        
        // Rising lines
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            ctx.globalAlpha = alpha * (1 - i * 0.15);
            ctx.beginPath();
            ctx.moveTo(centerX + 20 + i * 10, this.y + 100);
            ctx.lineTo(centerX + 30 + i * 12, this.y + 20 - i * 10);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    
    drawSolarBeamEffect(centerX, alpha) {
        const progress = this.attackFrame / this.attackStats[AttackType.SOLAR_BEAM].duration;
        const beamY = this.y + 55;
        const startX = centerX + 40;
        // Always draw to the right - canvas flip handles direction
        const beamLength = canvas.width + 200;
        
        ctx.save();
        
        // Phase 1: Charging (0 - 0.15)
        if (progress < 0.15) {
            const chargeProgress = progress / 0.15;
            
            // Charging orb - blue
            const orbRadius = 25 + chargeProgress * 40;
            const gradient = ctx.createRadialGradient(startX, beamY, 0, startX, beamY, orbRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(100, 200, 255, 0.95)');
            gradient.addColorStop(0.6, 'rgba(0, 150, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 100, 200, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(startX, beamY, orbRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Energy particles gathering - blue
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2 + this.attackFrame * 0.15;
                const dist = 100 * (1 - chargeProgress) + 25;
                const px = startX + Math.cos(angle) * dist;
                const py = beamY + Math.sin(angle) * dist;
                
                ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${180 + Math.random() * 75}, 255, ${alpha * 0.9})`;
                ctx.beginPath();
                ctx.arc(px, py, 5 + Math.random() * 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Phase 2: Firing beam (0.15 - 0.85)
        else if (progress < 0.85) {
            const fireProgress = (progress - 0.15) / 0.7;
            const currentLength = beamLength * Math.min(fireProgress * 1.5, 1);
            const beamWidth = 35 + Math.sin(this.attackFrame * 0.4) * 8;
            
            // Outer glow layer (cyan/blue) - largest
            ctx.globalAlpha = 0.4;
            const outerGlow = ctx.createLinearGradient(startX, beamY, startX + currentLength, beamY);
            outerGlow.addColorStop(0, 'rgba(0, 200, 255, 0.9)');
            outerGlow.addColorStop(0.5, 'rgba(0, 150, 255, 0.6)');
            outerGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
            
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.ellipse(startX + currentLength / 2, beamY, currentLength / 2, beamWidth * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Middle beam (blue)
            ctx.globalAlpha = 0.7;
            const midGradient = ctx.createLinearGradient(startX, beamY, startX + currentLength, beamY);
            midGradient.addColorStop(0, 'rgba(50, 150, 255, 1)');
            midGradient.addColorStop(0.5, 'rgba(0, 180, 255, 0.85)');
            midGradient.addColorStop(1, 'rgba(0, 120, 255, 0)');
            
            ctx.fillStyle = midGradient;
            ctx.beginPath();
            ctx.ellipse(startX + currentLength / 2, beamY, currentLength / 2, beamWidth, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Core beam (white/light blue)
            ctx.globalAlpha = 1;
            const coreGradient = ctx.createLinearGradient(startX, beamY, startX + currentLength, beamY);
            coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            coreGradient.addColorStop(0.3, 'rgba(200, 240, 255, 0.95)');
            coreGradient.addColorStop(0.7, 'rgba(100, 200, 255, 0.7)');
            coreGradient.addColorStop(1, 'rgba(50, 150, 255, 0)');
            
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.ellipse(startX + currentLength / 2, beamY, currentLength / 2, beamWidth / 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Energy source orb - bright blue/white
            const orbGradient = ctx.createRadialGradient(startX, beamY, 0, startX, beamY, 35);
            orbGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            orbGradient.addColorStop(0.3, 'rgba(200, 240, 255, 0.95)');
            orbGradient.addColorStop(0.6, 'rgba(50, 180, 255, 0.8)');
            orbGradient.addColorStop(1, 'rgba(0, 100, 200, 0.2)');
            
            ctx.fillStyle = orbGradient;
            ctx.beginPath();
            ctx.arc(startX, beamY, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // Energy particles along beam - blue sparkles
            for (let i = 0; i < 20; i++) {
                const px = startX + (Math.random() * currentLength);
                const py = beamY + (Math.random() - 0.5) * beamWidth * 1.2;
                const size = 3 + Math.random() * 5;
                
                ctx.fillStyle = `rgba(${150 + Math.random() * 105}, ${200 + Math.random() * 55}, 255, ${0.6 + Math.random() * 0.4})`;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Electric arcs along beam
            for (let j = 0; j < 2; j++) {
                ctx.strokeStyle = `rgba(${200 + Math.random() * 55}, 240, 255, 0.8)`;
                ctx.lineWidth = 1.5 + Math.random() * 1.5;
                ctx.beginPath();
                let lx = startX;
                let ly = beamY + (Math.random() - 0.5) * beamWidth * 0.5;
                ctx.moveTo(lx, ly);
                for (let k = 0; k < 8; k++) {
                    lx += (currentLength / 8);
                    ly = beamY + (Math.random() - 0.5) * beamWidth;
                    ctx.lineTo(lx, ly);
                }
                ctx.stroke();
            }
        }
        // Phase 3: Dissipating (0.85 - 1.0)
        else {
            const fadeProgress = (progress - 0.85) / 0.15;
            const remainingAlpha = (1 - fadeProgress) * alpha;
            const fadingLength = beamLength * (1 - fadeProgress * 0.8);
            const fadingWidth = 35 * (1 - fadeProgress);
            
            // Fading beam
            ctx.globalAlpha = remainingAlpha * 0.5;
            const fadingBeam = ctx.createLinearGradient(startX, beamY, startX + fadingLength, beamY);
            fadingBeam.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
            fadingBeam.addColorStop(1, 'rgba(0, 100, 255, 0)');
            
            ctx.fillStyle = fadingBeam;
            ctx.beginPath();
            ctx.ellipse(startX + fadingLength / 2, beamY, fadingLength / 2, fadingWidth, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Fading orb
            ctx.globalAlpha = remainingAlpha;
            const fadingGradient = ctx.createRadialGradient(startX, beamY, 0, startX, beamY, 30 * (1 - fadeProgress));
            fadingGradient.addColorStop(0, 'rgba(200, 240, 255, 1)');
            fadingGradient.addColorStop(0.5, 'rgba(50, 180, 255, 0.7)');
            fadingGradient.addColorStop(1, 'rgba(0, 100, 200, 0)');
            
            ctx.fillStyle = fadingGradient;
            ctx.beginPath();
            ctx.arc(startX, beamY, 40 * (1 - fadeProgress), 0, Math.PI * 2);
            ctx.fill();
            
            // Scattered particles - blue
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = fadeProgress * 150 + Math.random() * 80;
                const px = startX + Math.cos(angle) * dist;
                const py = beamY + Math.sin(angle) * dist;
                
                ctx.fillStyle = `rgba(${100 + Math.random() * 100}, ${180 + Math.random() * 75}, 255, ${remainingAlpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(px, py, 4 + Math.random() * 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    
    drawEarthquakeEffect(centerX, alpha) {
        const stats = this.attackStats[AttackType.EARTHQUAKE];
        const progress = this.attackFrame / stats.duration;
        const groundY = canvas.height * GROUND_Y;
        
        ctx.save();
        
        // Phase 1: Charging/Jump (0 - 0.20)
        if (progress < 0.20) {
            const chargeProgress = progress / 0.20;
            
            // Energy gathering at feet
            const orbRadius = 15 + chargeProgress * 25;
            const gradient = ctx.createRadialGradient(centerX, groundY - 10, 0, centerX, groundY - 10, orbRadius);
            gradient.addColorStop(0, 'rgba(139, 90, 43, 1)');
            gradient.addColorStop(0.5, 'rgba(101, 67, 33, 0.8)');
            gradient.addColorStop(1, 'rgba(60, 40, 20, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, groundY - 10, orbRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Dust particles rising
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2 + this.attackFrame * 0.1;
                const dist = 30 + chargeProgress * 40;
                const px = centerX + Math.cos(angle) * dist;
                const py = groundY - 10 - chargeProgress * 30 + Math.sin(this.attackFrame * 0.2) * 5;
                
                ctx.fillStyle = `rgba(139, 90, 43, ${alpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(px, py, 3 + Math.random() * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Phase 2: Slam impact (0.20 - 0.35)
        else if (progress < 0.35) {
            const impactProgress = (progress - 0.20) / 0.15;
            
            // Impact shockwave
            const waveRadius = impactProgress * canvas.width * 0.8;
            const waveWidth = 30 - impactProgress * 20;
            
            ctx.strokeStyle = `rgba(139, 90, 43, ${(1 - impactProgress) * 0.8})`;
            ctx.lineWidth = waveWidth;
            ctx.beginPath();
            ctx.arc(centerX, groundY, waveRadius, Math.PI, 0);
            ctx.stroke();
            
            // Ground crack lines radiating outward
            ctx.strokeStyle = `rgba(60, 40, 20, ${(1 - impactProgress * 0.5) * alpha})`;
            ctx.lineWidth = 3;
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI - Math.PI / 2;
                const length = impactProgress * 200 + Math.random() * 50;
                ctx.beginPath();
                ctx.moveTo(centerX, groundY);
                ctx.lineTo(
                    centerX + Math.cos(angle) * length,
                    groundY + Math.sin(angle) * Math.abs(Math.sin(angle)) * length * 0.3
                );
                ctx.stroke();
            }
            
            // Debris flying up
            for (let i = 0; i < 20; i++) {
                const debrisX = centerX + (Math.random() - 0.5) * waveRadius * 2;
                const debrisY = groundY - impactProgress * 100 * Math.random();
                const size = 4 + Math.random() * 8;
                
                ctx.fillStyle = `rgba(${80 + Math.random() * 60}, ${50 + Math.random() * 40}, ${20 + Math.random() * 30}, ${alpha * 0.9})`;
                ctx.beginPath();
                ctx.arc(debrisX, debrisY, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Phase 3: Ground shaking (0.35 - 0.85)
        else if (progress < 0.85) {
            const shakeProgress = (progress - 0.35) / 0.50;
            const shakeIntensity = 1 - shakeProgress;
            
            // Shaking ground waves
            ctx.strokeStyle = `rgba(139, 90, 43, ${shakeIntensity * 0.6})`;
            ctx.lineWidth = 4;
            
            for (let w = 0; w < 3; w++) {
                const waveOffset = (this.attackFrame * 8 + w * 100) % canvas.width;
                ctx.beginPath();
                for (let x = 0; x < canvas.width; x += 10) {
                    const waveY = groundY + Math.sin((x + waveOffset) * 0.05) * 8 * shakeIntensity;
                    if (x === 0) ctx.moveTo(x, waveY);
                    else ctx.lineTo(x, waveY);
                }
                ctx.stroke();
            }
            
            // Rock debris falling
            for (let i = 0; i < 15 * shakeIntensity; i++) {
                const debrisX = Math.random() * canvas.width;
                const debrisY = groundY - 20 + Math.random() * 30;
                const size = 2 + Math.random() * 5;
                
                ctx.fillStyle = `rgba(100, 70, 40, ${shakeIntensity * 0.7})`;
                ctx.beginPath();
                ctx.arc(debrisX, debrisY, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Dust clouds
            for (let i = 0; i < 8; i++) {
                const cloudX = (i / 8) * canvas.width;
                const cloudY = groundY - 10 + Math.sin(this.attackFrame * 0.3 + i) * 10;
                const cloudSize = 30 + shakeIntensity * 40;
                
                const dustGradient = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, cloudSize);
                dustGradient.addColorStop(0, `rgba(139, 90, 43, ${shakeIntensity * 0.3})`);
                dustGradient.addColorStop(1, 'rgba(139, 90, 43, 0)');
                
                ctx.fillStyle = dustGradient;
                ctx.beginPath();
                ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Phase 4: Settling (0.85 - 1.0)
        else {
            const settleProgress = (progress - 0.85) / 0.15;
            const fadeAlpha = (1 - settleProgress) * alpha;
            
            // Fading dust
            for (let i = 0; i < 5; i++) {
                const cloudX = (i / 5) * canvas.width + canvas.width * 0.1;
                const cloudY = groundY - 20 - settleProgress * 30;
                const cloudSize = 25 * (1 - settleProgress);
                
                const dustGradient = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, cloudSize);
                dustGradient.addColorStop(0, `rgba(139, 90, 43, ${fadeAlpha * 0.2})`);
                dustGradient.addColorStop(1, 'rgba(139, 90, 43, 0)');
                
                ctx.fillStyle = dustGradient;
                ctx.beginPath();
                ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

// Enemy AI Class
class EnemyAI {
    constructor(fighter) {
        this.fighter = fighter;
        this.actionCooldown = 0;
        this.decisionTimer = 0;
        this.currentAction = 'idle';
        this.aggressiveness = 0.65;
        this.reactionTime = 12;
        this.comboChance = 0.3;
    }
    
    update(player) {
        this.decisionTimer++;
        if (this.actionCooldown > 0) this.actionCooldown--;
        
        const distance = Math.abs(this.fighter.centerX - player.centerX);
        const isPlayerAttacking = player.isAttacking;
        const playerHealth = player.health / player.maxHealth;
        const myHealth = this.fighter.health / this.fighter.maxHealth;
        
        // Make decisions
        if (this.decisionTimer >= this.reactionTime && this.actionCooldown <= 0) {
            this.decisionTimer = 0;
            this.makeDecision(player, distance, isPlayerAttacking, playerHealth, myHealth);
        }
        
        // Execute current action
        this.executeAction(player, distance);
    }
    
    makeDecision(player, distance, isPlayerAttacking, playerHealth, myHealth) {
        const rand = Math.random();
        
        // Use special attack if boost is full and decent chance
        if (this.fighter.boostMeter >= 100 && rand < 0.4) {
            this.currentAction = 'special_attack';
            this.actionCooldown = 80;
            return;
        }
        
        // React to player attacks
        if (isPlayerAttacking && distance < 150) {
            if (rand < 0.5) {
                this.currentAction = 'block';
                this.actionCooldown = 25;
                return;
            } else if (rand < 0.75) {
                this.currentAction = 'retreat';
                this.actionCooldown = 18;
                return;
            }
        }
        
        // Low health = more desperate/aggressive
        if (myHealth < 0.3 && rand < 0.4) {
            this.currentAction = 'ko_strike';
            this.actionCooldown = 60;
            return;
        }
        
        // Close range combat
        if (distance < 100) {
            if (rand < 0.15) {
                this.currentAction = 'ko_strike';
                this.actionCooldown = 55;
            } else if (rand < 0.3) {
                this.currentAction = 'power_slash';
                this.actionCooldown = 40;
            } else if (rand < 0.5) {
                this.currentAction = 'combo';
                this.actionCooldown = 30;
            } else if (rand < 0.7) {
                this.currentAction = 'slash';
                this.actionCooldown = 22;
            } else if (rand < 0.85) {
                this.currentAction = 'uppercut';
                this.actionCooldown = 28;
            } else {
                this.currentAction = 'block';
                this.actionCooldown = 25;
            }
        }
        // Medium range - approach or flying kick
        else if (distance < 250) {
            if (rand < 0.35) {
                this.currentAction = 'flying_kick';
                this.actionCooldown = 40;
            } else if (rand < 0.6) {
                this.currentAction = 'approach';
                this.actionCooldown = 25;
            } else if (rand < 0.8) {
                this.currentAction = 'jump_approach';
                this.actionCooldown = 35;
            } else {
                this.currentAction = 'slash';
                this.actionCooldown = 25;
            }
        }
        // Far range - aggressive approach
        else {
            if (rand < 0.5) {
                this.currentAction = 'approach';
                this.actionCooldown = 20;
            } else if (rand < 0.8) {
                this.currentAction = 'flying_kick';
                this.actionCooldown = 45;
            } else {
                this.currentAction = 'jump_approach';
                this.actionCooldown = 30;
            }
        }
    }
    
    executeAction(player, distance) {
        const direction = player.centerX > this.fighter.centerX ? 1 : -1;
        
        switch (this.currentAction) {
            case 'approach':
                this.fighter.velocityX = direction * this.fighter.speed * 0.8;
                this.fighter.isBlocking = false;
                break;
                
            case 'jump_approach':
                if (this.fighter.isGrounded) {
                    this.fighter.velocityY = this.fighter.jumpForce;
                }
                this.fighter.velocityX = direction * this.fighter.speed * 0.6;
                this.fighter.isBlocking = false;
                break;
                
            case 'retreat':
                this.fighter.velocityX = -direction * this.fighter.speed * 0.7;
                this.fighter.isBlocking = false;
                break;
                
            case 'slash':
                if (distance < 120) {
                    this.fighter.attack(AttackType.SLASH);
                } else {
                    this.fighter.velocityX = direction * this.fighter.speed * 0.5;
                }
                this.fighter.isBlocking = false;
                break;
                
            case 'power_slash':
                if (distance < 130) {
                    this.fighter.attack(AttackType.POWER_SLASH);
                } else {
                    this.fighter.velocityX = direction * this.fighter.speed * 0.6;
                }
                this.fighter.isBlocking = false;
                break;
                
            case 'flying_kick':
                if (distance < 300 && distance > 80) {
                    this.fighter.attack(AttackType.FLYING_KICK);
                } else if (distance >= 300) {
                    this.fighter.velocityX = direction * this.fighter.speed * 0.7;
                }
                this.fighter.isBlocking = false;
                break;
                
            case 'combo':
                if (distance < 110) {
                    this.fighter.attack(AttackType.COMBO);
                } else {
                    this.fighter.velocityX = direction * this.fighter.speed * 0.5;
                }
                this.fighter.isBlocking = false;
                break;
                
            case 'uppercut':
                if (distance < 90) {
                    this.fighter.attack(AttackType.UPPERCUT);
                } else {
                    this.fighter.velocityX = direction * this.fighter.speed * 0.5;
                }
                this.fighter.isBlocking = false;
                break;
                
            case 'ko_strike':
                if (distance < 140) {
                    this.fighter.attack(AttackType.KO_STRIKE);
                } else {
                    this.fighter.velocityX = direction * this.fighter.speed * 0.7;
                }
                this.fighter.isBlocking = false;
                break;
                
            case 'special_attack':
                // Use the fighter's special attack (SOLAR_BEAM or EARTHQUAKE)
                this.fighter.attack(this.fighter.specialAttack);
                this.fighter.isBlocking = false;
                break;
                
            case 'block':
                this.fighter.isBlocking = true;
                this.fighter.velocityX *= 0.5;
                break;
                
            case 'idle':
            default:
                this.fighter.isBlocking = false;
                break;
        }
    }
}

// Game Class
class Game {
    constructor() {
        this.player = null;
        this.enemy = null;
        this.enemyAI = null;
        this.particles = [];
        this.damageNumbers = [];
        this.round = 1;
        this.combatText = '';
        this.combatTextTimer = 0;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Input handlers
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mouseup', () => this.handleMouseUp());
        canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu
        
        // Button handlers
        document.getElementById('start-btn').addEventListener('click', () => this.showCharacterSelect());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        
        // Character selection handlers
        document.getElementById('char-solar').addEventListener('click', () => this.selectCharacter(CharacterType.SOLAR));
        document.getElementById('char-earth').addEventListener('click', () => this.selectCharacter(CharacterType.EARTH));
    }
    
    showCharacterSelect() {
        document.getElementById('title-screen').classList.add('hidden');
        document.getElementById('character-select').classList.remove('hidden');
    }
    
    selectCharacter(type) {
        selectedCharacter = type;
        document.getElementById('character-select').classList.add('hidden');
        this.startGame();
    }
    
    resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 100;
    }
    
    handleKeyDown(e) {
        if (gameState !== GameState.PLAYING) return;
        
        const key = e.key.toLowerCase();
        if (key in keys) {
            keys[key] = true;
        }
        if (e.key === 'Shift') {
            keys.shift = true;
        }
        if (e.key === ' ') {
            keys.space = true;
            e.preventDefault();
        }
        
        // Special attack inputs
        if (key === 'q' && this.player) {
            // Flying kick
            this.player.attack(AttackType.FLYING_KICK);
        }
        if (key === 'e' && this.player) {
            // Uppercut
            this.player.attack(AttackType.UPPERCUT);
        }
        if (key === 'r' && this.player) {
            // Special attack (requires full boost meter)
            if (this.player.boostMeter >= 100) {
                this.player.attack(this.player.specialAttack);
                const attackName = this.player.characterType === CharacterType.SOLAR ? 'SOLAR BEAM!' : 'EARTHQUAKE!';
                this.showCombatText(attackName);
            }
        }
    }
    
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key in keys) {
            keys[key] = false;
        }
        if (e.key === 'Shift') {
            keys.shift = false;
        }
        if (e.key === ' ') {
            keys.space = false;
        }
    }
    
    handleMouseDown(e) {
        if (gameState !== GameState.PLAYING) return;
        
        mouseDown = true;
        
        const now = Date.now();
        if (now - lastClickTime < 300) {
            clickCount++;
        } else {
            clickCount = 1;
        }
        lastClickTime = now;
        
        // Attack on click
        if (this.player && !this.player.isAttacking) {
            // Right click = kick
            if (e.button === 2) {
                this.player.attack(AttackType.FLYING_KICK);
                return;
            }
            
            // Left click attacks
            if (keys.shift) {
                // Power slash
                this.player.attack(AttackType.POWER_SLASH);
            } else if (clickCount >= 3) {
                // Combo attack on rapid clicks
                this.player.attack(AttackType.COMBO);
                clickCount = 0;
            } else {
                // Normal slash
                this.player.attack(AttackType.SLASH);
            }
        }
    }
    
    handleMouseUp() {
        mouseDown = false;
    }
    
    startGame() {
        document.getElementById('character-select').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        // Update boost label based on character type
        const boostLabel = document.getElementById('boost-label');
        boostLabel.textContent = selectedCharacter === CharacterType.SOLAR ? 'SOLAR BEAM' : 'EARTHQUAKE';
        
        this.resetFightersForIntro();
        gameState = GameState.INTRO;
        this.introTimer = 0;
        this.introPhase = 'walk';  // walk -> stance -> fight
        
        this.introLoop();
    }
    
    resetFightersForIntro() {
        // Player uses selected character, enemy uses the other
        const playerType = selectedCharacter;
        const enemyType = selectedCharacter === CharacterType.SOLAR ? CharacterType.EARTH : CharacterType.SOLAR;
        
        // Start fighters at edges of screen
        this.player = new Fighter(-80, true, playerType);  // Off-screen left
        this.enemy = new Fighter(canvas.width + 20, false, enemyType);  // Off-screen right
        this.enemy.facingRight = false;
        this.enemyAI = new EnemyAI(this.enemy);
        
        this.player.y = this.player.groundY;
        this.enemy.y = this.enemy.groundY;
        
        // Target positions
        this.playerTargetX = canvas.width * 0.25;
        this.enemyTargetX = canvas.width * 0.65;
        
        this.particles = [];
        this.damageNumbers = [];
        
        this.updateHealthBars();
        this.updateBoostMeter();
        document.getElementById('round-text').textContent = `ROUND ${this.round}`;
    }
    
    introLoop() {
        if (gameState !== GameState.INTRO) return;
        
        this.introTimer++;
        
        // Phase 1: Walk toward each other (0-90 frames)
        if (this.introPhase === 'walk') {
            // Move player right
            if (this.player.x < this.playerTargetX) {
                this.player.x += 4;
                this.player.state = 'walk';
            }
            // Move enemy left
            if (this.enemy.x > this.enemyTargetX) {
                this.enemy.x -= 4;
                this.enemy.state = 'walk';
            }
            
            // Check if both arrived
            if (this.player.x >= this.playerTargetX && this.enemy.x <= this.enemyTargetX) {
                this.introPhase = 'stance';
                this.introTimer = 0;
                this.player.state = 'idle';
                this.enemy.state = 'idle';
            }
        }
        // Phase 2: Take fighting stance (30 frames pause)
        else if (this.introPhase === 'stance') {
            if (this.introTimer > 30) {
                this.introPhase = 'fight';
                this.introTimer = 0;
                this.showCombatText('FIGHT!');
            }
        }
        // Phase 3: Start fight
        else if (this.introPhase === 'fight') {
            if (this.introTimer > 45) {
                gameState = GameState.PLAYING;
                this.gameLoop();
                return;
            }
        }
        
        // Update animations
        this.player.updateAnimation();
        this.enemy.updateAnimation();
        
        // Render
        this.render();
        
        requestAnimationFrame(() => this.introLoop());
    }
    
    restartGame() {
        document.getElementById('result-screen').classList.add('hidden');
        this.round = 1;
        this.showCharacterSelect();
    }
    
    resetFighters() {
        // Player uses selected character, enemy uses the other
        const playerType = selectedCharacter;
        const enemyType = selectedCharacter === CharacterType.SOLAR ? CharacterType.EARTH : CharacterType.SOLAR;
        
        this.player = new Fighter(canvas.width * 0.25, true, playerType);
        this.enemy = new Fighter(canvas.width * 0.65, false, enemyType);
        this.enemy.facingRight = false;
        this.enemyAI = new EnemyAI(this.enemy);
        
        this.player.y = this.player.groundY;
        this.enemy.y = this.enemy.groundY;
        
        this.particles = [];
        this.damageNumbers = [];
        
        this.updateHealthBars();
        this.updateBoostMeter();
        document.getElementById('round-text').textContent = `ROUND ${this.round}`;
    }
    
    gameLoop() {
        if (gameState !== GameState.PLAYING) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Process player input
        this.processPlayerInput();
        
        // Update enemy AI
        this.enemyAI.update(this.player);
        
        // Update fighters
        this.player.update(this.enemy);
        this.enemy.update(this.player);
        
        // Check for hits
        this.checkCombat();
        
        // Update particles
        this.updateParticles();
        
        // Update damage numbers
        this.updateDamageNumbers();
        
        // Update combat text
        if (this.combatTextTimer > 0) {
            this.combatTextTimer--;
            if (this.combatTextTimer === 0) {
                document.getElementById('combat-text').classList.remove('show');
            }
        }
        
        // Check game over
        this.checkGameOver();
        
        // Update health bars
        this.updateHealthBars();
        
        // Update boost meter
        this.updateBoostMeter();
    }
    
    processPlayerInput() {
        // Movement
        if (keys.a) {
            this.player.velocityX = -this.player.speed;
        }
        if (keys.d) {
            this.player.velocityX = this.player.speed;
        }
        
        // Jump - W or Space
        if ((keys.w || keys.space) && this.player.isGrounded) {
            this.player.velocityY = this.player.jumpForce;
        }
        
        // Block
        this.player.isBlocking = keys.s && !this.player.isAttacking;
    }
    
    checkCombat() {
        // Player attacks enemy
        const playerHit = this.player.checkHit(this.enemy);
        if (playerHit) {
            // Special attacks have reduced knockback since they hit multiple times
            const knockbackMultiplier = (playerHit.isSolarBeam || playerHit.isEarthquake) ? 0.2 : 1;
            this.enemy.takeDamage(playerHit.damage, this.player.centerX < this.enemy.centerX, playerHit.isKO, knockbackMultiplier);
            this.spawnHitParticles(this.enemy.centerX, this.enemy.centerY, playerHit.attackType);
            this.spawnDamageNumber(this.enemy.centerX, this.enemy.y, playerHit.damage, playerHit.attackType, playerHit.blocked);
            
            // Less screen shake for solar beam continuous hits
            if (!playerHit.isSolarBeam && !playerHit.isEarthquake) {
                this.screenShake(playerHit.isKO ? 2 : 1);
            }
            
            // Add boost for successful hits (10 per hit = 10 hits for full meter)
            if (!playerHit.blocked && !playerHit.isSolarBeam && !playerHit.isEarthquake) {
                this.player.addBoost(10);
                this.updateBoostMeter();
            }
            
            // Show combat text only once for special attacks
            if (playerHit.isSolarBeam && this.player.attackFrame < 30) {
                this.showCombatText('SOLAR BEAM!');
                this.screenShake(2);
            } else if (playerHit.isEarthquake && this.player.attackFrame < 30) {
                this.showCombatText('EARTHQUAKE!');
                this.screenShake(3);
            } else if (playerHit.isKO) {
                this.showCombatText('KO STRIKE!');
            } else if (playerHit.isFlyingKick) {
                this.showCombatText('FLYING KICK!');
            } else if (playerHit.attackType === AttackType.POWER_SLASH) {
                this.showCombatText('POWER HIT!');
            } else if (playerHit.attackType === AttackType.COMBO) {
                this.showCombatText('COMBO!');
            } else if (playerHit.attackType === AttackType.UPPERCUT) {
                this.showCombatText('UPPERCUT!');
            }
        }
        
        // Enemy attacks player
        const enemyHit = this.enemy.checkHit(this.player);
        if (enemyHit) {
            const knockbackMultiplier = (enemyHit.isSolarBeam || enemyHit.isEarthquake) ? 0.2 : 1;
            this.player.takeDamage(enemyHit.damage, this.enemy.centerX < this.player.centerX, enemyHit.isKO, knockbackMultiplier);
            this.spawnHitParticles(this.player.centerX, this.player.centerY, enemyHit.attackType);
            this.spawnDamageNumber(this.player.centerX, this.player.y, enemyHit.damage, enemyHit.attackType, enemyHit.blocked);
            
            if (!enemyHit.isSolarBeam && !enemyHit.isEarthquake) {
                this.screenShake(enemyHit.isKO ? 2 : 1);
            }
            
            // Add boost for enemy on successful hits (10 per hit = 10 hits for full meter)
            if (!enemyHit.blocked && !enemyHit.isSolarBeam && !enemyHit.isEarthquake) {
                this.enemy.addBoost(10);
            }
        }
    }
    
    updateBoostMeter() {
        const boostFill = document.getElementById('boost-fill');
        const boostText = document.getElementById('boost-text');
        const boostContainer = document.getElementById('boost-container');
        
        if (boostFill && boostText && boostContainer) {
            const percent = Math.min(this.player.boostMeter, 100);
            boostFill.style.height = `${percent}%`;
            boostText.textContent = `${Math.floor(percent)}%`;
            
            if (percent >= 100) {
                boostContainer.classList.add('boost-ready');
            } else {
                boostContainer.classList.remove('boost-ready');
            }
        }
    }
    
    spawnHitParticles(x, y, attackType) {
        const count = attackType === AttackType.KO_STRIKE ? 30 : 
                      attackType === AttackType.POWER_SLASH ? 20 : 15;
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 18,
                vy: (Math.random() - 0.5) * 18,
                life: 35,
                maxLife: 35,
                size: 3 + Math.random() * 6,
                type: attackType
            });
        }
    }
    
    spawnDamageNumber(x, y, damage, attackType, blocked) {
        this.damageNumbers.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y,
            damage: damage,
            attackType: attackType,
            blocked: blocked,
            life: 70
        });
    }
    
    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4;
            p.vx *= 0.98;
            p.life--;
            return p.life > 0;
        });
    }
    
    updateDamageNumbers() {
        this.damageNumbers = this.damageNumbers.filter(d => {
            d.y -= 1.5;
            d.life--;
            return d.life > 0;
        });
    }
    
    screenShake(intensity = 1) {
        canvas.parentElement.classList.add('shake');
        canvas.parentElement.style.setProperty('--shake-intensity', intensity);
        setTimeout(() => {
            canvas.parentElement.classList.remove('shake');
        }, 300 * intensity);
    }
    
    showCombatText(text) {
        const textEl = document.getElementById('combat-text');
        textEl.textContent = text;
        textEl.classList.add('show');
        this.combatTextTimer = 60;
    }
    
    updateHealthBars() {
        const playerHealthPercent = (this.player.health / this.player.maxHealth) * 100;
        const enemyHealthPercent = (this.enemy.health / this.enemy.maxHealth) * 100;
        
        document.getElementById('player-health').style.width = `${playerHealthPercent}%`;
        document.getElementById('enemy-health').style.width = `${enemyHealthPercent}%`;
        
        document.getElementById('player-health-text').textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;
        document.getElementById('enemy-health-text').textContent = `${Math.ceil(this.enemy.health)}/${this.enemy.maxHealth}`;
    }
    
    checkGameOver() {
        if (this.player.health <= 0 || this.enemy.health <= 0) {
            gameState = GameState.GAME_OVER;
            
            const playerWon = this.enemy.health <= 0;
            
            setTimeout(() => {
                document.getElementById('game-screen').classList.add('hidden');
                document.getElementById('result-screen').classList.remove('hidden');
                
                const resultText = document.getElementById('result-text');
                const resultSubtitle = document.getElementById('result-subtitle');
                
                if (playerWon) {
                    resultText.textContent = 'VICTORY';
                    resultSubtitle.textContent = 'The shadows bow before you';
                } else {
                    resultText.textContent = 'DEFEATED';
                    resultSubtitle.textContent = 'The darkness consumes all';
                }
            }, 1500);
        }
    }
    
    render() {
        // Clear canvas
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw ground
        this.drawGround();
        
        // Draw particles (behind fighters)
        this.drawParticles();
        
        // Draw fighters (back one first based on position)
        if (this.player.x < this.enemy.x) {
            this.enemy.draw();
            this.player.draw();
        } else {
            this.player.draw();
            this.enemy.draw();
        }
        
        // Draw damage numbers
        this.drawDamageNumbers();
    }
    
    drawBackground() {
        // Lighter atmospheric gradient for visibility
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height * 0.3, 0,
            canvas.width / 2, canvas.height * 0.3, canvas.width * 0.8
        );
        gradient.addColorStop(0, '#4a4a5e');
        gradient.addColorStop(0.5, '#3a3a4a');
        gradient.addColorStop(1, '#2a2a38');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Moon/light source - brighter
        const moonX = canvas.width * 0.5;
        const moonY = canvas.height * 0.15;
        const moonGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 180);
        moonGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        moonGradient.addColorStop(0.3, 'rgba(220, 220, 240, 0.25)');
        moonGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = moonGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.5);
        
        // Distant mountains/structures - lighter
        ctx.fillStyle = '#2a2a3a';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.6);
        
        for (let x = 0; x <= canvas.width; x += 50) {
            const height = Math.sin(x * 0.01) * 50 + Math.sin(x * 0.02) * 30 + canvas.height * 0.5;
            ctx.lineTo(x, height);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
        
        // Subtle fog effect
        const fogGradient = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
        fogGradient.addColorStop(0, 'transparent');
        fogGradient.addColorStop(1, 'rgba(60, 60, 80, 0.3)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);
    }
    
    drawGround() {
        const groundY = canvas.height * GROUND_Y;
        
        // Main ground - lighter for visibility
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        groundGradient.addColorStop(0, '#3a3a4a');
        groundGradient.addColorStop(1, '#2a2a38');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        
        // Ground line/edge effect
        ctx.strokeStyle = '#5a5a6a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();
        
        // Subtle ground texture
        ctx.strokeStyle = 'rgba(80, 80, 100, 0.3)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 80) {
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x + 40, canvas.height);
            ctx.stroke();
        }
    }
    
    drawParticles() {
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            let color;
            
            switch (p.type) {
                case AttackType.KO_STRIKE:
                    color = `rgba(255, 200, 50, ${alpha})`;
                    break;
                case AttackType.FLYING_KICK:
                    color = `rgba(100, 200, 255, ${alpha})`;
                    break;
                case AttackType.POWER_SLASH:
                    color = `rgba(200, 150, 255, ${alpha})`;
                    break;
                default:
                    color = `rgba(255, 255, 255, ${alpha})`;
            }
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    drawDamageNumbers() {
        this.damageNumbers.forEach(d => {
            const alpha = d.life / 70;
            const scale = 1 + (1 - d.life / 70) * 0.3;
            
            let fontSize, color;
            
            if (d.blocked) {
                fontSize = 22;
                color = `rgba(100, 150, 255, ${alpha})`;
            } else {
                switch (d.attackType) {
                    case AttackType.KO_STRIKE:
                        fontSize = 38;
                        color = `rgba(255, 200, 50, ${alpha})`;
                        break;
                    case AttackType.POWER_SLASH:
                        fontSize = 32;
                        color = `rgba(200, 100, 255, ${alpha})`;
                        break;
                    case AttackType.FLYING_KICK:
                        fontSize = 30;
                        color = `rgba(100, 200, 255, ${alpha})`;
                        break;
                    case AttackType.COMBO:
                        fontSize = 28;
                        color = `rgba(255, 150, 100, ${alpha})`;
                        break;
                    case AttackType.UPPERCUT:
                        fontSize = 28;
                        color = `rgba(150, 255, 150, ${alpha})`;
                        break;
                    default:
                        fontSize = 24;
                        color = `rgba(255, 80, 80, ${alpha})`;
                }
            }
            
            ctx.font = `bold ${fontSize * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = color;
            
            if (d.blocked) {
                ctx.fillText(`BLOCKED -${d.damage}`, d.x, d.y);
            } else {
                ctx.fillText(`-${d.damage}`, d.x, d.y);
            }
        });
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Game();
});
