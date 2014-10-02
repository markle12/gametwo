window.onerror = function(e, url, line) {
    alert(e+'\n'+line+'\n'+url);
}

var KEYCODE_A = 65;
var KEYCODE_S = 83;
var KEYCODE_D = 68;
var KEYCODE_W = 87;

var posneg = function() {
    return game.rnd.integerInRange(0,10) > 5 ? -1 : 1;
};

var touch_joystick = {
    sprite: null,
    init: function(game, coords, sprite_id) {
        this.sprite = game.add.sprite(coords.x, coords.y, sprite_id);
        this.sprite.inputEnabled = true;
        this.sprite.input.disableDrag();
        this.last_used_pointer = null;
        this.pointers = [
            game.input.pointer1,
            game.input.pointer2
        ];
    },
    get_active_pointer: function() {
        if (this.last_used_pointer && this.sprite.input.checkPointerDown(this.last_used_pointer)) {
            return this.last_used_pointer;
        } else { 
            for (var i = 0; i < this.pointers.length; i++) {
                if (this.sprite.input.checkPointerDown(this.pointers[i])) {
                    this.last_used_pointer = this.pointers[i];
                    return this.last_used_pointer;
                }
            }
            return null;
        }
    },
    coords: function() {
        if (this.sprite) {
            var pointer = this.get_active_pointer();
            if (pointer) {
                return {
                    x: (this.sprite.input.pointerX(pointer.id) - (this.sprite.width / 2)) / (this.sprite.width / 2),
                    y: (this.sprite.input.pointerY(pointer.id) - (this.sprite.height / 2)) / (this.sprite.height / 2)
                };
            }
        }
        return {
            x: null,
            y: null
        };
    }
}

/*** Enemy Definitions! ***/
var enemy_controller = {
    type: 'base',
    point_value: 1,
    rotation: 25,
    control_interval: 1000,
    next_control: 0,
    spritelist: ['enemy1','enemy2','enemy3',],
    init: function(sprite) {
        game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,800), game.rnd.integerInRange(0,450), 100);
    },
    behavior: function(sprite) {
        if (game.rnd.integerInRange(0, 100) < 35) {
            game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,800), game.rnd.integerInRange(0,450), 100);
        }
    }
};


                 
var curver_controller = Object.create(enemy_controller);

curver_controller.type = 'curver';
curver_controller.spritelist = ['enemy6'];
curver_controller.point_value = 4;
curver_controller.control_interval = 200;
curver_controller.current_curve_axis = 'x';
curver_controller.current_curve_speed = 0;
curver_controller.max_velocity = 300;
curver_controller.curve = function(sprite, x, y) {
    var primary_axis = game.rnd.integerInRange(0,10) > 5 ? 'x' : 'y';
    var curve_axis = primary_axis == 'x' ? 'y' : 'x';
    sprite.body.velocity[primary_axis] = 150 * posneg();
    sprite.body.velocity[curve_axis] = 1;
    this.current_curve_axis = curve_axis;
    this.current_curve_speed = 11 * posneg();
};

curver_controller.init = function(sprite) {
    sprite.animations.add('throb', null, 10, true);
    sprite.play('throb');
    this.curve(sprite);
};

curver_controller.behavior = function(sprite) {    
    if (Math.abs(sprite.body.velocity[this.current_curve_axis]) >= this.max_velocity || sprite.body.deltaX() == 0 || sprite.body.deltaY() == 0) {
        this.curve(sprite);
    } else {
        
        sprite.body.velocity[this.current_curve_axis] += this.current_curve_speed;    
    }
};

var enemy2_controller = Object.create(enemy_controller);

enemy2_controller.type = 'enemy2';
enemy2_controller.point_value = 2;
enemy2_controller.spritelist = ['enemy5'];
enemy2_controller.rotation = 15;
enemy2_controller.init = function(sprite) {
    sprite.animations.add('throb', null, 10, true);
    sprite.play('throb')
    game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,800), game.rnd.integerInRange(0,450), 100);
};

enemy2_controller.behavior = function(sprite) {
    if (game.rnd.integerInRange(0, 100) < 40) {
        if (game.rnd.integerInRange(0, 100) > 50) {
            game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,800), game.rnd.integerInRange(0,450), 100);    
        } else {
            game.physics.arcade.moveToObject(sprite, main.player, 200);
        }
    }
}

/*** End Enemy Definitions! ***/

var spawn_thresholds = {
    0: {
        enemies: ['base'],
        bonuses: []
    },
    10: {
        enemies: ['base', 'animated'],
        bonuses: []
    },
    25: {
        enemies: ['base', 'animated', 'curver']
    },
    50: {
        enemies: ['animated', 'curver']
    }
};

var enemy_types = {
    'base': enemy_controller,
    'animated': enemy2_controller,
    'curver': curver_controller
};

var main = {
    spawn_chance: 5,
    kills: 0,
    score: 0,
    max_player_speed: 120,
    player_acceleration: 5,
    shot_cooldown: 165,
    next_shot: 0,
    last_frame_time: 0,
    fullscreen: false,
    accelerate: function(body, dimension, amount) {
        if (amount === undefined) {
            amount = this.player_acceleration;
        };
        if (body.velocity[dimension] < this.max_player_speed) {
            if (this.max_player_speed - body.velocity[dimension] > amount) {
                body.velocity[dimension] += amount;
            } else {
                body.velocity[dimension] = this.max_player_speed;
            }      
        }
    },
    decelerate: function(body, dimension, amount) {
        if (amount === undefined) {
            amount = this.player_acceleration;
        }
        if (body.velocity[dimension] > (this.max_player_speed * -1)) {
            if ((this.max_player_speed * -1) < body.velocity[dimension] - amount) {
                body.velocity[dimension] -= amount;
            } else {
                body.velocity[dimension] = this.max_player_speed * -1;
            }
        }
    },
    shoot: function(x, y) {
        
        if (this.player.alive && game.time.now > this.next_shot) {
            if (this.projectiles.countDead() > 0) {
                var pew = this.projectiles.getFirstDead();
                pew.reset(this.player.x, this.player.y);
            } else {
                var pew = game.add.sprite(this.player.x, this.player.y, 'projectile');
                pew.anchor.setTo(0.5, 0.5);
                pew.checkWorldBounds = true;
                pew.outOfBoundsKill = true;
                this.projectiles.add(pew);
                game.physics.enable(pew, Phaser.Physics.ARCADE);

                if (!game.device.android) {
                    pew.emitter = game.add.emitter(pew.x, pew.y, 100);
                    pew.emitter.gravity = 0;
                    pew.emitter.maxParticleSpeed.x = 30;
                    pew.emitter.maxParticleSpeed.y = 30;

                    pew.emitter.makeParticles(['particle1', 'particle2']);    
                }
            }

                
            if (!game.device.android) { 
            
                pew.emitter.start(false, 250, 0, 0, false);

                pew.events.onKilled.addOnce(function() {
                    pew.emitter.kill();
                    pew.emitter.forEachAlive(function(particle) {
                        particle.kill(); // According to the docs this should not be necessary
                    });
                });
                
                pew.events.onDestroy.addOnce(function() {
                    pew.emitter.destroy(true);
                })
                
                game.physics.arcade.moveToPointer(pew, 300);
            } else {
                var x = this.player.x + (x * 20);
                var y = this.player.y + (y * 20);
                game.physics.arcade.moveToXY(pew, x, y, 300);
            }

            
            this.next_shot = game.time.now + this.shot_cooldown;
        }
    },
    create_enemy: function() {
        var current_level = 0;
        var thresholds = Object.keys(spawn_thresholds);
        for (var i = 0; i < thresholds.length; i++) {
            if (thresholds[i] > this.score) {
                break;
            }
            current_level = spawn_thresholds[thresholds[i]];
        }
        
        
        var new_enemy_type = current_level.enemies[game.rnd.integerInRange(0, current_level.enemies.length-1)];
       
        // do check recycle in this.enemies_by_type
        if (this.enemies_by_type[new_enemy_type] !== undefined && this.enemies_by_type[new_enemy_type].countDead() > 0) {
            var enemy = this.enemies_by_type[new_enemy_type].getFirstDead();
            enemy.reset(game.rnd.integerInRange(0,800), game.rnd.integerInRange(0,450));
        } else {   
            if (this.enemies_by_type[new_enemy_type] === undefined) {
                this.enemies_by_type[new_enemy_type] = game.add.group();
            }
            var controller = Object.create(enemy_types[new_enemy_type]);
            var enemy = game.add.sprite(game.rnd.integerInRange(0,800), game.rnd.integerInRange(0,450), controller.spritelist[game.rnd.integerInRange(0, controller.spritelist.length-1)]);
            game.physics.enable(enemy, Phaser.Physics.ARCADE);
            enemy.anchor.setTo(0.5, 0.5);
            enemy.body.collideWorldBounds = true;
                
            enemy.controller = controller;
            
            this.enemies_by_type[new_enemy_type].add(enemy);
            
        }
        
        
        enemy.controller.init(enemy);
        enemy.controller.behavior(enemy);
        enemy.controller.next_control = game.time.now + enemy.controller.control_interval;
    },
    explode_at: function(x, y) {
        
        if (this.explosions.countDead() > 0) {
            var explosion = this.explosions.getFirstDead();
        } else {
            var explosion = game.add.emitter(0, 0, 200);
            this.explosions.add(explosion);
            explosion.makeParticles(['redparticle','orangeparticle','yellowparticle']);
            explosion.gravity = 0;
            explosion.minParticleScale = 0.2;
            explosion.maxParticleScale = 0.6;
            explosion.setAlpha(0.3, 0.8);
            explosion.minParticleSpeed.setTo(-50, -50);
            explosion.maxParticleSpeed.setTo(50, 50);
        }
        
        explosion.x = x;
        explosion.y = y;
        
        explosion.start(true, 400, null, 60);
        
        game.time.events.add(400, function() {
            explosion.kill();
            explosion.forEachAlive(function(particle) {
                particle.kill();
            });
        });
        
    },
    preload: function() {
        game.time.advancedTiming = true;
        game.load.image('player', 'assets/player.png');
        
        game.load.image('projectile', 'assets/pew.png');
        game.load.image('particle1', 'assets/particle1.png');
        game.load.image('particle2', 'assets/particle2.png');
        game.load.image('redparticle', 'assets/redparticle.png');
        game.load.image('yellowparticle', 'assets/yellowparticle.png');
        game.load.image('orangeparticle', 'assets/orangeparticle.png');
        game.load.image('enemy1', 'assets/enemy1.png');
        game.load.image('enemy2', 'assets/enemy2.png');
        game.load.image('enemy3', 'assets/enemy3.png');
        game.load.image('enemy4', 'assets/enemy4.png');
        
        game.load.spritesheet('enemy5', 'assets/enemy_sheet.png', 20, 20);
        game.load.spritesheet('enemy6', 'assets/greensheet.png', 10, 10);
        
        game.load.image('touch_circle','assets/control_circle.png');
    },
    create: function() {
        // Mobile controls
        if (game.device.android) {
            this.joystick_left = Object.create(touch_joystick);
            this.joystick_left.init(game, {x: 0, y: 300}, 'touch_circle');
        
        
            this.joystick_right = Object.create(touch_joystick);
            this.joystick_right.init(game, {x: 650, y: 300}, 'touch_circle');
        }

        // Entity groups
        this.projectiles = game.add.group();
        this.enemies_by_type = {};
        
        // Emitter groups
        this.explosions = game.add.group();
        
        game.physics.startSystem(Phaser.Physics.ARCADE);
 
        this.player = game.add.sprite(200, 200, 'player');
        this.player.anchor.setTo(0.5, 0.5);
        
        game.physics.enable(this.player, Phaser.Physics.ARCADE);
        this.player.body.collideWorldBounds = true;
        
        var text_style = {
            'font': "14px 'Paytone One'",
            'fill': 'white',
            'align': 'left'
        };
        
        this.fps_text = game.add.text(10, 10, 'FPS: 0', text_style);
        this.score_text = game.add.text(10, 28, 'Score: 0', text_style);
        
    },
    reset: function() {
        for (var type in this.enemies_by_type) {
            this.enemies_by_type[type].destroy(true);
            delete this.enemies_by_type[type];
        }
        
        this.projectiles.destroy(true);
        this.explosions.destroy(true);
        
        this.projectiles = game.add.group();
        this.explosions = game.add.group();
        
        this.kills = 0;
        this.score = 0;
        this.spawn_chance = 5;
        this.score_text.text = 'Score: 0';
        
        this.player.reset(200, 200);
    },
    go_fullscreen: function() {
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.startFullScreen(false);
    },
    update: function() {
        this.fps_text.text = 'FPS: '+game.time.fps;
        this.score_text.text = 'Score: '+this.kills;
        
        var _this = this;
        // Move emitters
        
        
        
        if (game.device.android) {
            // process mobile controls
            var left_joystick_coords = this.joystick_left.coords();
            var right_joystick_coords = this.joystick_right.coords();
           
            for (var axis in left_joystick_coords) {
                if (left_joystick_coords[axis] !== null) {
                    if (left_joystick_coords[axis] > 0) {
                        this.accelerate(this.player.body, axis, this.player_acceleration * left_joystick_coords[axis]);
                    } else {
                        
                        this.decelerate(this.player.body, axis, this.player_acceleration * Math.abs(left_joystick_coords[axis]));
                    }
                }
            }
            
            if (right_joystick_coords.x !== null) {
                this.shoot(right_joystick_coords.x, right_joystick_coords.y);
            }
        } else {
            
            this.projectiles.forEachAlive(function(pew) {
                pew.emitter.x = pew.x;
                pew.emitter.y = pew.y;
            });
            // Process Input
            if (game.input.activePointer.isDown) {
                
                this.shoot();
                
            }

            if (game.input.keyboard.isDown(KEYCODE_A)) {
                this.decelerate(this.player.body, 'x');
            }

            if (game.input.keyboard.isDown(KEYCODE_D)) {
                this.accelerate(this.player.body, 'x');
            }

            if (game.input.keyboard.isDown(KEYCODE_S)) {
                this.accelerate(this.player.body, 'y');
            }

            if (game.input.keyboard.isDown(KEYCODE_W)) {
                this.decelerate(this.player.body, 'y');
            }
        }
        
        var frame_delta = game.time.now - this.last_frame_time;
        var frames = frame_delta / (1000 / 60); // Pretending 60fps
        
        this.player.angle += 15 * frames;
        Object.keys(this.enemies_by_type).forEach(function(type) {
            // Collide stuff
            game.physics.arcade.collide(_this.projectiles, _this.enemies_by_type[type], function(projectile, enemy) {
                projectile.kill();
                _this.explode_at(enemy.x, enemy.y);
                _this.score += enemy.controller.point_value;
                enemy.kill();
                _this.kills += 1;
            });
            
            game.physics.arcade.collide(_this.player, _this.enemies_by_type[type], function(player, enemy) {
                _this.player.kill();
                _this.explode_at(_this.player.x, _this.player.y);
                game.time.events.add(1000, function() {
                    _this.reset();
                });
            });
            
            _this.enemies_by_type[type].forEachAlive(function(enemy) {
                enemy.angle += enemy.controller.rotation * frames;
                if (game.time.now >= enemy.controller.next_control) {
                    
                    enemy.controller.behavior(enemy);
                    enemy.controller.next_control = game.time.now + enemy.controller.control_interval;
                }
            });
            
           
        });
 
        // Generate Enemies
        
        if (game.rnd.integerInRange(0, 1000) < (this.spawn_chance * frames)) {
            this.create_enemy();
        }
        
        this.spawn_chance = 5 + (Math.floor(this.score / 10));
        
        this.last_frame_time = game.time.now;
        
    }
};

var game;

window.onload = function() {
    document.getElementById('my_fullscreen').onclick = function() {
        main.go_fullscreen();
    };

    game = new Phaser.Game(800, 450, Phaser.AUTO, 'gameDiv');
    game.state.add('main', main);
    game.state.start('main');
}