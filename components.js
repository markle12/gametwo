// Generic stuff that could probably be applied to future projects!

// Touch Joystick
define('Components', function() {
    return function(game) {
        var touch_joystick = {
            sprite: null,
            init: function(coords, sprite_id) {
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
        };

        // Enemy Controller
        var enemy_controller = {
            health: 1,
            type: 'base',
            point_value: 1,
            rotation: 25,
            control_interval: 1000,
            next_control: 0,
            centerx: 0.5,
            centery: 0.5,
            spritelist: ['enemy1','enemy2'],
            init: function(sprite) {
                game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,GAME_WIDTH), game.rnd.integerInRange(0,GAME_HEIGHT), 100);
            },
            behavior: function(sprite) {
                if (game.rnd.integerInRange(0, 100) < 35) {
                    game.physics.arcade.moveToXY(sprite, game.rnd.integerInRange(0,GAME_WIDTH), game.rnd.integerInRange(0,GAME_HEIGHT), 100);
                }
            },
            onkill: function(sprite) {

            }
        };

        // Highscore manager
        var highscores = {
            scores: null,
            init: function() {
                if (window.localStorage !== undefined && window.localStorage !== null) {
                    if (localStorage['spinner_highscores']) {
                        this.scores = JSON.parse(localStorage['spinner_highscores']);
                    } else {
                        this.scores = {score_history: []};
                        localStorage['spinner_highscores'] = JSON.stringify(this.scores);
                    }
                }
            },
            update: function(score) {
                var date = new Date();
                var datestring = date.toLocaleDateString() + ' '+date.toLocaleTimeString();
                this.scores.score_history.push({score: score, date: datestring});
                localStorage['spinner_highscores'] = JSON.stringify(this.scores);
            },
            top_ten_string: function() {
                var sorted = this.scores.score_history.sort(function(a,b) {
                    return b.score - a.score;
                });

                var time_string = '';
                var score_string = '';
                for (var i = 0; i < 10; i++) {
                    if (i > sorted.length - 1) {
                        break;
                    }
                    time_string += sorted[i].date+'\n';
                    score_string += sorted[i].score+'\n';

                }
                return {date: time_string, score: score_string};
            },
            text_style: {
                'font': "14px Arial",
                'fill': 'white',
                'align': 'left'
            },
            text_elements: [],
            offset_x: 250,
            offset_y: 50,
            render_scores: function() {
                var strings = this.top_ten_string();
                this.text_elements.push(game.add.text(this.offset_x, this.offset_y, 'High Scores:', this.text_style));
                this.text_elements.push(game.add.text(this.offset_x, this.offset_y+25, strings.date, this.text_style));
                this.text_elements.push(game.add.text(this.offset_x + 200, this.offset_y+25, strings.score, this.text_style));    
            },
            clear: function() {
                for (var i = 0; i < this.text_elements.length; i++) {
                    this.text_elements[i].destroy();
                }
                this.text_elements.length = 0;
            }
        }
        return {
            touch_joystick: touch_joystick,
            highscores: highscores,
            enemy_controller: enemy_controller
        }
    }
});