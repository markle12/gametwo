
var VERSION = '0.2.2';
var KEYCODE_A = 65;
var KEYCODE_S = 83;
var KEYCODE_D = 68;
var KEYCODE_W = 87;
var GAME_WIDTH = 1200;
var GAME_HEIGHT = 675;

var extend = function(base, extension) {
    var new_obj = Object.create(base);
    for (var prop in extension) {
        new_obj[prop] = extension[prop];
    }
    return new_obj;
};

require.config({
    paths: {
        'Phaser': 'phaser.min',
        'Components': 'components'
    }
});

require(['Phaser','Components'], function(Phaser, Components) {
    
    var posneg = function() {
        return game.rnd.integerInRange(0,10) > 5 ? -1 : 1;
    };

    /*** Powerups! ***/
    var powerup = {
        property: null,
        increment: 0,
        player_effect: null,
        sprite: null,
        destroy_on_impact: true
    };

    var shot_damage_powerup = {
        property: 'shot_damage',
        increment: 1,
        player_effect: 'player_effect_blue',
        sprite: 'bluearrow'
    };

    var shot_speed_powerup = {
        property: 'shot_speed',
        increment: 50,
        player_effect: 'player_effect_yellow',
        sprite: 'yellowarrow'
    };

    var accel_powerup = {
        property: 'player_acceleration',
        increment: 1,
        player_effect: 'player_effect_green',
        sprite: 'greenarrow'
    };
    
    var shield_powerup = {
        property: 'shield_points',
        increment: 1,
        player_effect: 'player_effect_shield',
        sprite: 'shield_icon'
    };

    var powerup_types = [
        shot_damage_powerup,
        shot_speed_powerup,
        accel_powerup,
        shield_powerup
    ];
    
    var enemies_setup = function() {
        var enemies = {};

        enemies.curver = extend(components.enemy_controller, {
            type: 'curver',
            spritelist: ['enemy6'],
            point_value: 4,
            control_interval: 200,
            current_curve_axis: 'x',
            current_curve_speed: 0,
            max_velocity: 300,
            curve: function(sprite, x, y) {
                var primary_axis = game.rnd.integerInRange(0,10) > 5 ? 'x' : 'y';
                var curve_axis = primary_axis == 'x' ? 'y' : 'x';
                sprite.body.velocity[primary_axis] = 150 * posneg();
                sprite.body.velocity[curve_axis] = 1;
                this.current_curve_axis = curve_axis;
                this.current_curve_speed = 11 * posneg();
            },
            init: function(sprite) {
                    sprite.animations.add('throb', null, 10, true);
                    sprite.play('throb');
                    this.curve(sprite);
            },
            behavior: function(sprite) {    
                if (Math.abs(sprite.body.velocity[this.current_curve_axis]) >= this.max_velocity || sprite.body.deltaX() == 0 || sprite.body.deltaY() == 0) {
                    this.curve(sprite);
                } else {

                    sprite.body.velocity[this.current_curve_axis] += this.current_curve_speed;    
                }
            }
        });
      
        enemies.enemy1 = extend(components.enemy_controller, {
            type: 'enemy1',
            point_value: 1,
            spritelist: ['enemy1', 'enemy2'],
            init: function(sprite) {
                sprite.animations.add('throb', null, 10, true);
                sprite.play('throb');
                game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,GAME_WIDTH), game.rnd.integerInRange(0,GAME_HEIGHT), 100);
            }
        });

        enemies.enemy2 = extend(components.enemy_controller, {
            type: 'enemy2',
            point_value: 2,
            health: 2,
            spritelist: ['enemy5'],
            rotation: 15,
            init: function(sprite) {
                sprite.animations.add('throb', null, 10, true);
                sprite.play('throb');
                game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,GAME_WIDTH), game.rnd.integerInRange(0,GAME_HEIGHT), 100);
            },
            behavior: function(sprite) {
                if (game.rnd.integerInRange(0, 100) < 40) {
                    if (game.rnd.integerInRange(0, 100) > 50) {
                        game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,GAME_WIDTH), game.rnd.integerInRange(0,GAME_HEIGHT), 100);    
                    } else {
                        game.physics.arcade.moveToObject(sprite, main.player, 200);
                    }
                }
            }
        });
        
        enemies.bigenemy = extend(components.enemy_controller, {
            type: 'bigenemy',
            point_value: 6,
            rotation: 15,
            spritelist: ['bigenemy'],
            health: 6,
            init: function(sprite) {
                sprite.animations.add('throb', null, 10, true);
                sprite.play('throb');
                game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,GAME_WIDTH), game.rnd.integerInRange(0,GAME_HEIGHT), 100);
            },
            onkill: function(sprite) {
                var spawnx = sprite.x;
                var spawny = sprite.y;
                main.create_enemy('splitdude', spawnx, spawny);
                main.create_enemy('splitdude', spawnx, spawny);
                main.create_enemy('splitdude', spawnx, spawny);
                main.create_enemy('splitdude', spawnx, spawny);
            }
        });
        
        enemies.splitdude = extend(components.enemy_controller, {
            type: 'splitdude',
            spritelist: ['splitdude'],
            control_interval: 500,
            target_player: true,
            init: function(sprite) {
                game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,GAME_WIDTH), game.rnd.integerInRange(0,GAME_HEIGHT), 200);
                this.next_control = game.time.now + 200;
            },
            behavior: function(sprite) {
                if (this.target_player) {
                    game.physics.arcade.moveToObject(sprite, main.player, 300);
                    this.target_player = false;
                } else {
                    if (game.rnd.integerInRange(0, 100) < 10) {
                        this.target_player = true;
                    }
                }
            }
        });
        
        enemies.centipede_part = extend(components.enemy_controller, {
            type: 'centipede_part',
            spritelist: ['centipede_part'],
            control_interval: 50,
            max_per_axis: 200,
            current_axis: 'x',
            increment: 10,
            last_switch: 0,
            init: function(sprite, init_options) {
                this.animation = sprite.animations.add('throb', null, 10, true);
                sprite.play('throb');
                
                if (init_options === undefined) {   
                    this.is_follow = false;
                }
                else
                {
                    this.is_follow = init_options.is_follow;
                    this.following = init_options.following;
                    this.animation.setFrame(init_options.setframe, true);
                    
                }
                
                if (!this.is_follow) {
                    var segments = game.rnd.integerInRange(3, 8);
                    var x_spread = game.rnd.integerInRange(5, 10) * posneg();
                    var y_spread = game.rnd.integerInRange(5, 10) * posneg();
                    
                    var prev_sprite;
                    for (var i = 0; i < segments; i++) {
                        var follow = i == 0 ? sprite : prev_sprite;
                        
                        var new_part = main.create_enemy('centipede_part', follow.x + x_spread, follow.y + y_spread, {
                            is_follow: true,
                            following: follow,
                            setframe: i
                        });
                        
                        prev_sprite = new_part;
                    }
                }
            },
            behavior: function(sprite) {
                if (this.is_follow) {
                    if (this.following.alive) {
                        var speed = game.physics.arcade.distanceBetween(sprite, this.following) * 4;
                        game.physics.arcade.moveToObject(sprite, this.following, speed);
                    } else {
                        this.is_follow = false;
                    }
                } else {
                    if (Math.abs(sprite.body.velocity[this.current_axis]) >= this.max_per_axis || game.time.now - this.last_switch > 3000) {
                        this.current_axis = game.rnd.integerInRange(0,100) > 50 ? 'x' : 'y';
                        this.increment = 10 * posneg();
                        sprite.body.velocity.x = game.rnd.integerInRange(50,100) * posneg();
                        sprite.body.velocity.y = game.rnd.integerInRange(50,100) * posneg();
                        this.last_switch = game.time.now;
                    } else {
                        sprite.body.velocity[this.current_axis] += this.increment;
                    }
                }
            }
        });
        return enemies;
    };
    
    var spawn_thresholds = {
        0: {
            enemies: ['enemy1'],
            bonuses: []
        },
        10: {
            enemies: ['enemy1', 'enemy2'],
            bonuses: []
        },
        25: {
            enemies: ['enemy1', 'enemy2', 'curver']
        },
        50: {
            enemies: ['enemy2', 'curver', 'centipede_part']
        },
        80: {
            enemies: ['enemy2', 'centipede_part', 'bigenemy']
        }
    };
    

    var main = {
        spawn_chance: 5,
        kills: 0,
        score: 0,
        shot_damage: 1,
        max_player_speed: 150,
        player_acceleration: 5,
        shot_cooldown: 165,
        next_shot: 0,
        shot_speed: 350,
        last_frame_time: 0,
        fullscreen: false,
        shield_points: 0,
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

                    game.physics.arcade.moveToPointer(pew, this.shot_speed);
                } else {
                    var x = this.player.x + (x * 20);
                    var y = this.player.y + (y * 20);
                    game.physics.arcade.moveToXY(pew, x, y, this.shot_speed);
                }


                this.next_shot = game.time.now + this.shot_cooldown;
            }
        },
        create_powerup: function(type, x ,y) {
            var powerup = game.add.sprite(x, y, type.sprite);
            game.physics.enable(powerup, Phaser.Physics.ARCADE);
            powerup.controller = type;
            this.powerups.add(powerup);
        },
        random_powerup: function() {
            var type = powerup_types[game.rnd.integerInRange(0,powerup_types.length-1)];
            this.create_powerup(type, game.rnd.integerInRange(0, GAME_WIDTH), game.rnd.integerInRange(0, GAME_HEIGHT));    
        },
        create_enemy: function(type, x, y, init_options) {
            var _this = this;
            // do check recycle in this.enemies_by_type
            if (this.enemies_by_type[type] !== undefined && this.enemies_by_type[type].countDead() > 0) {
                var enemy = this.enemies_by_type[type].getFirstDead();
                enemy.reset(x, y, enemy.controller.health);
            } else {   
                if (this.enemies_by_type[type] === undefined) {
                    this.enemies_by_type[type] = game.add.group();
                }
                var controller = Object.create(enemies[type]);
                var enemy = game.add.sprite(x, y, controller.spritelist[game.rnd.integerInRange(0, controller.spritelist.length-1)]);
                game.physics.enable(enemy, Phaser.Physics.ARCADE);
                enemy.anchor.setTo(controller.centerx, controller.centery);
                enemy.health = controller.health;
                enemy.body.collideWorldBounds = true;

                enemy.controller = controller;

                this.enemies_by_type[type].add(enemy);

                enemy.events.onKilled.add(function() {
                    controller.onkill(enemy);
                    _this.kills += 1;
                    _this.score += controller.point_value;
                });
            }

            if (game.physics.arcade.overlap(enemy, this.player)) {
                enemy.x = game.rnd.integerInRange(0, GAME_WIDTH);
                enemy.y = game.rnd.integerInRange(0, GAME_HEIGHT);
            }
            
            enemy.body.bounce = 0.8;

            enemy.controller.init(enemy, init_options);
            enemy.controller.behavior(enemy);
            enemy.controller.next_control = game.time.now + enemy.controller.control_interval;
            return enemy;
        },
        random_spawn: function() {
            var _this = this;
            var current_level = 0;
            var thresholds = Object.keys(spawn_thresholds);
            for (var i = 0; i < thresholds.length; i++) {
                if (thresholds[i] > this.score) {
                    break;
                }
                current_level = spawn_thresholds[thresholds[i]];
            }


            var new_enemy_type = current_level.enemies[game.rnd.integerInRange(0, current_level.enemies.length-1)];
            var x = game.rnd.integerInRange(0, GAME_WIDTH);
            var y = game.rnd.integerInRange(0, GAME_HEIGHT);
            this.create_enemy(new_enemy_type, x, y);
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

            game.load.image('bluearrow', 'assets/bluearrow.png');
            game.load.image('greenarrow', 'assets/greenarrow.png');
            game.load.image('yellowarrow', 'assets/yellowarrow.png');
            game.load.image('shield_icon', 'assets/shield_icon.png');
            game.load.image('player_effect_blue', 'assets/bluespriteeffect.png');
            game.load.image('player_effect_green', 'assets/greenspriteeffect.png');
            game.load.image('player_effect_yellow', 'assets/yellowspriteeffect.png');
            game.load.image('player_effect_shield', 'assets/shield.png');
            

            game.load.image('splitdude','assets/split_dude.png');


            game.load.spritesheet('enemy1', 'assets/enemy1_new.png', 16, 16);
            game.load.spritesheet('enemy2', 'assets/enemy2_new.png', 16, 16);
            game.load.spritesheet('enemy5', 'assets/enemy_sheet.png', 20, 20);
            game.load.spritesheet('enemy6', 'assets/greensheet.png', 10, 10);
            game.load.spritesheet('bigenemy', 'assets/bigenemy_sheet.png', 35, 35);
            game.load.spritesheet('centipede_part','assets/centipede_sheet.png', 20, 20);

            game.load.image('touch_circle','assets/control_circle.png');
        },
        create: function() {
            components.highscores.init();

            // Mobile controls
            if (game.device.android) {
                this.joystick_left = Object.create(components.touch_joystick);
                this.joystick_left.init({x: 0, y: 300}, 'touch_circle');


                this.joystick_right = Object.create(components.touch_joystick);
                this.joystick_right.init({x: 650, y: 300}, 'touch_circle');
            }

            for (var i = 0; i < powerup_types.length; i++) {
                this[powerup_types[i].property+'_default'] = this[powerup_types[i].property];
            }

            // Entity groups
            this.projectiles = game.add.group();
            this.enemies_by_type = {};

            // Emitter groups
            this.explosions = game.add.group();

            this.powerups = game.add.group();
            this.player_effects = game.add.group();
            this.current_effect_offset = 0;

            game.physics.startSystem(Phaser.Physics.ARCADE);

            this.player = game.add.sprite(200, 200, 'player');
            this.player.anchor.setTo(0.5, 0.5);

            game.physics.enable(this.player, Phaser.Physics.ARCADE);
            this.player.body.collideWorldBounds = true;
            this.player.body.bounce = 1;

            var text_style = {
                'font': "14px Arial",
                'fill': 'white',
                'align': 'left'
            };

            this.fps_text = game.add.text(10, 10, 'FPS: 0', text_style);
            this.score_text = game.add.text(10, 28, 'Score: 0', text_style);

        },
        is_game_over: false,
        game_over: function() {

            this.is_game_over = true;
            for (var type in this.enemies_by_type) {
                this.enemies_by_type[type].destroy(true);
                delete this.enemies_by_type[type];
            }

            this.projectiles.destroy(true);
            this.explosions.destroy(true);
            this.powerups.destroy(true);
            this.player_effects.destroy(true);

            components.highscores.update(this.score);
            components.highscores.render_scores();

            var text_style = {
                'font': "14px Arial",
                'fill': 'blue',
                'align': 'left'
            };
            this.retry = game.add.text(250, 400, 'Retry', text_style);

            this.retry.inputEnabled = true;

            this.retry.input.start();

        },
        reset: function() {
            for (var i = 0; i < powerup_types.length; i++) {
                this[powerup_types[i].property] = this[powerup_types[i].property+'_default'];
            }

            components.highscores.clear();
            this.is_game_over = false;

            this.retry.destroy();

            this.projectiles = game.add.group();
            this.explosions = game.add.group();
            this.powerups = game.add.group();
            this.player_effects = game.add.group();

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
            if (this.is_game_over) {
                if (this.retry.input.pointerDown(game.input.activePointer.id)) {
                    this.reset();
                }
                return;
            }

            this.fps_text.text = 'FPS: '+game.time.fps;
            this.score_text.text = 'Score: '+this.score;

            var _this = this;
            // Move emitters



            

            var frame_delta = game.time.now - this.last_frame_time;
            var frames = frame_delta / (1000 / 60); // Pretending 60fps

            this.player.angle += 15 * frames;

            this.player_effects.forEach(function(effect) {
                effect.x = _this.player.x;
                effect.y = _this.player.y;
                effect.angle += 20 * frames;
            });

            Object.keys(this.enemies_by_type).forEach(function(type) {
                // Collide stuff
                game.physics.arcade.collide(_this.projectiles, _this.enemies_by_type[type], function(projectile, enemy) {
                    projectile.kill();
                    _this.explode_at(enemy.x, enemy.y);

                    enemy.damage(_this.shot_damage);
                });

                game.physics.arcade.collide(_this.player, _this.enemies_by_type[type], function(player, enemy) {
                    if (_this.player.alive) {
                        if (_this.shield_points < 1) {
                            _this.player.kill();
                            _this.explode_at(_this.player.x, _this.player.y);
                            game.time.events.add(1000, function() {
                                _this.game_over();
                            });
                        } else {
                            _this.shield_points -= 1;
                            var breakloop = false;
                            _this.player_effects.forEachAlive(function(effect) {
                                if (!breakloop && effect.spritename == 'player_effect_shield') {
                                    effect.kill();
                                    breakloop = true;
                                }
                            });
                        }
                    }
                });

                _this.enemies_by_type[type].forEachAlive(function(enemy) {
                    enemy.angle += enemy.controller.rotation * frames;
                    if (game.time.now >= enemy.controller.next_control) {

                        enemy.controller.behavior(enemy);
                        enemy.controller.next_control = game.time.now + enemy.controller.control_interval;
                    }
                });


            });

            game.physics.arcade.overlap(this.player, this.powerups, function(player, powerup) {
                powerup.kill();
                var new_effect = game.add.sprite(player.x, player.y, powerup.controller.player_effect);
                
                new_effect.angle = _this.current_effect_offset;
                new_effect.anchor.setTo(0.5, 0.5);
             
                _this[powerup.controller.property] += powerup.controller.increment;
                new_effect.spritename = powerup.controller.player_effect;
                _this.player_effects.add(new_effect);
                this.current_effect_offset += 21;
            });

            // Generate Enemies

            if (game.rnd.integerInRange(0, 1000) < (this.spawn_chance * frames)) {
                this.random_spawn();
            }

            if (game.rnd.integerInRange(0, 10000) < 5) {
                this.random_powerup();
            }
            
            if (game.device.android) {
                // process mobile controls
                var left_joystick_coords = this.joystick_left.coords();
                var right_joystick_coords = this.joystick_right.coords();

                for (var axis in left_joystick_coords) {
                    if (left_joystick_coords[axis] !== null) {
                        if (left_joystick_coords[axis] > 0) {
                            this.accelerate(this.player.body, axis, this.player_acceleration * left_joystick_coords[axis] * 1.5);
                        } else {

                            this.decelerate(this.player.body, axis, this.player_acceleration * Math.abs(left_joystick_coords[axis]) * 1.5);
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

            this.spawn_chance = 5 + (Math.floor(this.score / 10));

            this.last_frame_time = game.time.now;

        }
    };

    document.getElementById('my_fullscreen').onclick = function() {
        main.go_fullscreen();
    };

    game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, 'gameDiv');
    game.state.add('main', main);
    game.state.start('main');

    components = Components(game);
    enemies = enemies_setup();
    
});