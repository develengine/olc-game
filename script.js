function div(a, b)
{
    return parseInt(a / b);
}


function cap_off(a)
{
    var cutoff = 0.1;
    if (a > -cutoff && a < cutoff) {
        return 0;
    }
    return a;
}


var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

if (!window.AudioContext) {
    if (!window.webkitAudioContext) {
        alert("Your browser doesn't support Web Audio API!");
    } else {
        window.AudioContext = window.webkitAudioContext;
    }
}

var audioCtx = new window.AudioContext();

var debug1 = document.getElementById("dbg1");
var debug2 = document.getElementById("dbg2");
var debug3 = document.getElementById("dbg3");
var debug4 = document.getElementById("dbg4");
var debug5 = document.getElementById("dbg5");

const cv_width = canvas.width;
const cv_height = canvas.height;

var testArrayBuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 3, audioCtx.sampleRate);

var key_states = { };


window.onkeyup = function(e)
{
    key_states[e.key] = false;
}


window.onkeydown = function(e)
{
    key_states[e.key] = true;
    if (!e.repeat) {
        maybe_spawn();
    }
    if (e.key == 'ArrowUp' && !e.repeat) {
        jump_up();
        try_move_select();
    } else if (e.key == 'Escape' && !e.repeat) {
        pause_game();
    } else if (e.key == ' ' || e.key == 'Enter') {
        try_select();
    } else if (e.key == 'ArrowDown' || e.key == 'ArrowLeft' || e.key == 'ArrowRight') {
        try_move_select();
    }
}


canvas.addEventListener('contextmenu', event => event.preventDefault());


canvas.addEventListener('mousemove', function(e)
{
    var canvas_rect = canvas.getBoundingClientRect();
    var x = e.clientX - canvas_rect.left;
    var y = e.clientY - canvas_rect.top;
    click_handler(x, y, true);
}, false);


canvas.addEventListener('mousedown', function(e)
{
    var canvas_rect = canvas.getBoundingClientRect();
    var x = e.clientX - canvas_rect.left;
    var y = e.clientY - canvas_rect.top;
    click_handler(x, y, false);
    return false;
});


canvas.addEventListener('mouseup', function(e)
{
    var canvas_rect = canvas.getBoundingClientRect();
    var x = e.clientX - canvas_rect.left;
    var y = e.clientY - canvas_rect.top;
    debug3.textContent = "Mouse up: " + x + ", " + y;
    return false;
});


canvas.addEventListener("wheel", function(e) {
    e.preventDefault();
});


var images = { };
var to_load_images = [
    "obama.png", "concrete.jpg", "test.png", "clone.jpg",
    "spikes.jpg", "spikes_down.jpg", "spikes_right.jpg", "spikes_left.jpg",
    "ladder.png", "cracked_ladder.jpg", "breaking_ladder.jpg", "broken_ladder.png",
    "cracked.png", "crumbling.png", "falling.png",
    "control_red.png", "control_blue.png", "full_red.png", "full_blue.png", "empty_red.png", "empty_blue.png",
    "clock.png", "clock_collected.jpg",
    "num/0.png", "num/1.png", "num/2.png", "num/3.png", "num/4.png", "num/5.png", "num/6.png", "num/7.png", "num/8.png", "num/9.png",
    "num2/0.png", "num2/1.png", "num2/2.png", "num2/3.png", "num2/4.png", "num2/5.png", "num2/6.png", "num2/7.png", "num2/8.png", "num2/9.png", "num2/slash.png",
    "paused_screen.jpg", "title_screen.jpeg", "end_screen.jpg",
    "text/continue.png", "text/retry.png", "text/start.png", "text/degenerate.png", "text/select.png",
];
var loaded_imgs = 0;


function load_images()
{
    if (loaded_imgs < to_load_images.length) {
        var img_name = to_load_images[loaded_imgs];
        loaded_imgs++;
        var img = new Image();
        images[img_name] = img;
        images[img_name].onload = load_images;
        images[img_name].src = "res/images/" + img_name;
    } else {
        main();
    }
}


function play_sound(sound)
{
    var audio = new Audio("res/sounds/" + sound);
    audio.play();
    audio.addEventListener("canplaythrough", event => {
        audio.play();
    });
}


var time_old = performance.now();
var time_from_last_frame = 0;
var frames_this_second = 0;


function timing()
{
    var time_new = performance.now();
    var delta_time = (time_new - time_old);
    time_old = time_new;

    time_from_last_frame += delta_time;
    frames_this_second++;

    if (time_from_last_frame >= 1000) {
        var passed_seconds = Math.floor(time_from_last_frame / 1000);
        debug1.textContent = "FPS: " + (frames_this_second / passed_seconds).toString();
        frames_this_second = 0;
        time_from_last_frame = time_from_last_frame % 1000;
    }
    return delta_time;
}


function play_noise()
{
    var source = audioCtx.createBufferSource();
    source.buffer = testArrayBuffer;
    source.connect(audioCtx.destination);
    source.start();
}


var is_played = false;
/*
var map_schematic = [
    "          #                              ",
    "# # #################    ########F#######",
    " P                      #        F       ",
    "###XXXX#              #          F       ",
    "  #                      E S  H  F       ",
    "                     #########H##F       ",
    "                   #          H  F       ",
    "                              H       S  ",
    "                  #       XX########H##  ",
    "#               #      M            H    ",
    "#           ###       3 E           H    ",
    "#           #          W            F    ",
    " #         #                        H    ",
    "          ##   W           C  bbC RRH    ",
    "             3       M  M  b        H    ",
    "####  ###################################",
    "####  ###################################"
];
*/
var map_schematic = [
    "#########################################################################",
    "# S   b  b           C    S  #      W                  #S H             #",
    "######b  b              ######  S                      ###H             #",
    "#     #  ########RRR#####    ######XXX#                #                #",
    "#                    H               H# b#bb   b#b   #H#    #           #",
    "#bbbbbb#RRRRRR#######H##X#XX#X#######H#M #MMMMM #MMM #H#M       #       #",
    "#      #            #H#              H################H##MMMMM      #   #",
    "#      #            #H#  S           H                 S#S             ##",
    "#M    M#######     ##H#####          H##########################        #",
    "#RRRRRR#           #   S##           F       3#     3#              #####",
    "#      ##          #H#####E  H##     H               #   XXXX####XXX    #",
    "#      ##   ########H   ##   H#     #H ##   #####E   #H       WW        #",
    "#  MMMM##           H   RR    #      HM# MMM     #E M#F###              #",
    "#bbbbbb#E           H   RR     # ### H##         #S 3#F   ###XXXX###    #",
    "#      #S M         H   ###     P                #####F     W    W      #",
    "#      #############H   ##   H####XXXX             H  H              ####",
    "#       #       b   F   ##    #            ########H#######XXXXXXXXXX   #",
    "#   S   #   S   b   H   ##    W        #   R   #   F      W           S #",
    "#       #       b       ##     S           R   S   H      S             #",
    "#################  #######    ####    ###  #####################  #######",
    "#################  #######    ####    ###  #####################  #######"
];

var map = [];

var map_width = 0;
var map_height = 0;
const tile_size = 64;


function is_solid(ch)
{
    return '#MW3EXKCcRB'.includes(ch);
}


function intersects(x1, y1, s1, x2, y2, s2)
{
    return ((x1 < x2 + s2) != (x1 + s1 < x2)) && ((y1 < y2 + s2) != (y1 + s1 < y2));
}


function axis_clip(map, vb, a, b, s1, s2, vertical)
{
    var map_a = vertical ? map[0].length : map.length;
    var map_b = vertical ? map.length : map[0].length;

    var div_a = div(a, tile_size);
    var both_b = (div_a < map_a - 1) && ((a % tile_size) + s1 > tile_size);
    var b_pos = vb < 0 ? b : b + s2 - 1;
    var b_next = b_pos + vb;
    var b_pos_div = div(b_pos, tile_size);
    var b_next_div = div(b_next, tile_size);
    var b_dir = vb < 0 ? -1 : 1;

    if (div_a < 0 || div_a >= map_a) {
        return vb;
    }

    function cant_move(i)
    {
        if (vertical) {
            return is_solid(map[i][div_a]) || (both_b && is_solid(map[i][div_a + 1]));
        }
        return is_solid(map[div_a][i]) || (both_b && is_solid(map[div_a + 1][i]));
    }

    for (var i = b_pos_div + b_dir; i != b_next_div + b_dir; i += b_dir) {
        if (i < 0 || i >= map_b) {
            return vb;
        }
        if (cant_move(i)) {
            if (b_dir == -1) {
                b_next = (i + 1) * tile_size;
            } else {
                b_next = i * tile_size - 1;
            }
            break;
        }
    }

    return b_next - b_pos;
}


const player_size = 48;
var player_origin_x = 0;
var player_origin_y = 0;
var player_x = 0;
var player_y = 0;
var velocity_x = 0;
var velocity_y = 0;
var spawned = false;

const ladder_boost = 5;
const player_acc = 0.75;
const gravity = 1;
const x_drag = 0.95;
const jump_vel = 17.25;
const jump_acc = 1.25;
const max_fall_speed = 14;
const ground_tolerance = 0;
const sps = 1000;
const tps = 61; // don't worry about it
const period = sps / tps;
const ladder_ttl = parseInt(tps * 1.5);
const crumbling_ttl = parseInt(tps * 0.5);
const faller_speed = 10;
const timer_time = parseInt(tps * 30);
const dying_time = parseInt(tps * 2);

var elapsed = period / 2;

var camera_x = 0;
var camera_y = 0;
const camera_drag = 0.1;

var timer_left = 0;

var paused = true;

var recording_buffer = [];
var recordings = [];
var tick_counter = 0;
var collected_clocks = [];

var dying = false;
var dying_left = 0;
var vi_von = false;
var bro_index = -1;

var clock_count = 0;


function is_on_map(x, y)
{
    return x > 0 && x < map_width && y > 0 && y < map_height;
}


function is_on_ground(xp, yp)
{
    var x1 = div(xp, tile_size);
    var x2 = div(xp + player_size - 1, tile_size);
    var y = div(yp + player_size + ground_tolerance, tile_size);

    if (y < 0 || y >= map_height) {
        return false;
    }

    if (x1 > 0 && x1 < map_width && is_solid(map[y][x1])) {
        return true;
    }

    if (x2 > 0 && x2 < map_width && is_solid(map[y][x2])) {
        return true;
    }

    return false;
}


function jump_up()
{
    if (!paused && is_on_ground(player_x, player_y)) {
        velocity_y = -jump_vel;
        velocity_x *= jump_acc;
    }
}


function reset_player()
{
    player_x = player_origin_x;
    player_y = player_origin_y;
    velocity_x = 0;
    velocity_y = 0;
    is_on_broken_ladder = false;
    is_on_ok_ladder = false;
    spawned = false;
    vi_von = false;
    dying = false;
    dying_left = 0;
    bro_index = -1;
    recording_buffer = [];
    load_level();
    pause_game();
}


function kill_player()
{
    dying = true;
    dying_left = dying_time;
}


function kill_bro(i)
{
    bro_index = i;
    kill_player();
}


const DIR_UP    = 0;
const DIR_DOWN  = 1;
const DIR_LEFT  = 2;
const DIR_RIGHT = 3;


function is_on(ch, x, y)
{
    var x1 = div(x, tile_size);
    var x2 = div(x + player_size - 1, tile_size);
    var y1 = div(y, tile_size);
    var y2 = div(y + player_size - 1, tile_size);

    if (is_on_map(x1, y1) && map[y1][x1] == ch) {
        return true;
    }
    if (is_on_map(x2, y1) && map[y1][x2] == ch) {
        return true;
    }
    if (is_on_map(x1, y2) && map[y2][x1] == ch) {
        return true;
    }
    if (is_on_map(x2, y2) && map[y2][x2] == ch) {
        return true;
    }

    return false;
}


var breaking_ladders = [];
var is_on_broken_ladder = false;
var is_on_ok_ladder = false;

var crumbling = [];
var falling = [];

var red_blue_blocks = [];


function load_level()
{
    map = [];
    red_blue_blocks = [];
    crumbling = [];
    falling = [];
    breaking_ladders = [];

    map_width = map_schematic[0].length;
    map_height = map_schematic.length;
    timer_left = timer_time;
    tick_counter = 0;
    clock_count = 0;

    for (var y = 0; y < map_height; y++) {
        var row = [];

        for (var x = 0; x < map_width; x++) {
            var ch = map_schematic[y][x];
            row.push(ch);

            if (ch == 'P') {
                player_x = x * tile_size;
                player_y = y * tile_size + tile_size - player_size;
                player_origin_x = player_x;
                player_origin_y = player_y;
            } else if (ch == 'S') {
                ++clock_count;
            }

            if ('cCrRbB'.includes(ch)) {
                red_blue_blocks.push({
                    'x': x,
                    'y': y
                });
            }
        }

        map.push(row);
    }

    for (var i = 0; i < collected_clocks.length; i++) {
        var clock = collected_clocks[i];
        map[clock.y][clock.x] = 's';
    }
}


function swap_red_blue()
{
    for (var i = 0; i < red_blue_blocks.length; i++) {
        var element = red_blue_blocks[i];
        var ch = map[element.y][element.x];

        if ('Cc'.includes(ch)) {
            map[element.y][element.x] = ch == 'C' ? 'c' : 'C';
        } else if ('Rr'.includes(ch)) {
            map[element.y][element.x] = ch == 'R' ? 'r' : 'R';
        } else if ('Bb'.includes(ch)) {
            map[element.y][element.x] = ch == 'B' ? 'b' : 'B';
        }
    }
}


function try_break_block(x, y)
{
    if (map[y][x] == 'X') {
        map[y][x] = 'K';
        crumbling.push({
            'x': x,
            'y': y,
            ttl: crumbling_ttl
        });
    }
}


function bump(x, y, dir, v)
{
    if (x < 0 || x >= map_width || y < 0 || y >= map_height) {
        return;
    }

    debug3.textContent = "Bump: " + x + ", " + y + "; "
                       + map[y][x] + "; "
                       + v.toString() + "; "
                       + dir.toString();

    switch (map[y][x]) {
        case 'M':
            if (dir == DIR_DOWN) {
                kill_player();
            }
            break;
        case 'W':
            if (dir == DIR_UP) {
                kill_player();
            }
            break;
        case 'E':
            if (dir == DIR_LEFT) {
                kill_player();
            }
            break;
        case '3':
            if (dir == DIR_RIGHT) {
                kill_player();
            }
            break;
        case 'X':
            if (dir == DIR_DOWN) {
                try_break_block(x, y);
                recording_buffer[recording_buffer.length - 1].blocks.push({
                    'x': x,
                    'y': y
                });
            }
            break;
        case 'C':
        case 'c':
            if (dir == DIR_UP) {
                swap_red_blue();
                recording_buffer[recording_buffer.length - 1].red_blue = true;
            }
            break;
        default:
            break;
    }
}


function try_break_ladder(x, y)
{
    if (map[y][x] == 'F') {
        breaking_ladders.push({
            'x': x,
            'y': y,
            ttl: ladder_ttl
        });
        map[y][x] = 'T';
    }
}


function is_in_solid(x, y)
{
    var solids = '#MW3EXKCcRB';
    for (var i = 0; i < solids.length; i++) {
        if (is_on(solids[i], x, y)) {
            return true;
        }
    }
    return false;
}


function over_update(ch, x, y)
{
    if (is_solid(ch)) {
        kill_player();
    }

    switch (ch) 
    {
        case 'H':
            is_on_ok_ladder = true;
            break;
        case 'F':
            try_break_ladder(x, y);
            recording_buffer[recording_buffer.length - 1].ladders.push({
                'x': x,
                'y': y
            });
            is_on_ok_ladder = true;
            break;
        case 'T':
            is_on_ok_ladder = true;
            break;
        case 'O':
            is_on_broken_ladder = true;
            break;
        case 'S':
            if (recording_buffer.length > 0) {
                recordings.push(recording_buffer);
                recording_buffer = [];
                collected_clocks.push({
                    'x': x,
                    'y': y
                });
                vi_von = true;
                kill_player();
            }
            break;
        default:
            break;
    }
}


function over_handler()
{
    var x1 = div(player_x, tile_size);
    var x2 = div(player_x + player_size - 1, tile_size);
    var y1 = div(player_y, tile_size);
    var y2 = div(player_y + player_size - 1, tile_size);

    if (is_on_map(x1, y1)) {
        over_update(map[y1][x1], x1, y1);
    }
    if (is_on_map(x2, y1)) {
        over_update(map[y1][x2], x2, y1);
    }
    if (is_on_map(x1, y2)) {
        over_update(map[y2][x1], x1, y2);
    }
    if (is_on_map(x2, y2)) {
        over_update(map[y2][x2], x2, y2);
    }
}


function game_tick()
{
    if (--timer_left <= 0) {
        kill_player();
        return;
    }

    is_on_ok_ladder = false;
    is_on_broken_ladder = false;

    var is_on_ladder = is_on('H', player_x, player_y) || is_on('F', player_x, player_y) || is_on('T', player_x, player_y);
    if (is_on_ladder) {
        velocity_x = 0;
        velocity_y = 0;
    }

    if (spawned) {
        if (key_states['ArrowRight']) {
            velocity_x += player_acc;
        }
        if (key_states['ArrowLeft']) {
            velocity_x -= player_acc;
        }
    }

    if (is_on_ladder && key_states['ArrowUp']) {
        velocity_y -= player_acc;
    }
    if (is_on_ladder && key_states['ArrowDown']) {
        velocity_y += player_acc;
    }

    if (!is_on_ladder) {
        velocity_x *= x_drag;
    } else {
        velocity_x *= ladder_boost;
        velocity_y *= ladder_boost;
    }
    velocity_x = cap_off(velocity_x);

    if (!is_on_ladder) {
        velocity_y += gravity;
    }
    velocity_y = Math.min(velocity_y, max_fall_speed);

    var rounded = parseInt(velocity_y);
    var clipped = axis_clip(map, rounded, player_x, player_y, player_size, player_size, true);
    player_y += clipped;
    if (clipped != rounded) {
        var dir = rounded > 0 ? 1 : -1;
        var d = dir > 0 ? DIR_DOWN : DIR_UP;

        var pos1 = div(player_x, tile_size);
        bump(pos1, div(player_y, tile_size) + dir, d, Math.abs(rounded - clipped));

        var pos2 = div(player_x + player_size - 1, tile_size);
        if (pos2 != pos1) {
            bump(pos2, div(player_y, tile_size) + dir, d, Math.abs(rounded - clipped));
        }

        velocity_y = 0;
    }
    rounded = parseInt(velocity_x);
    clipped = axis_clip(map, rounded, player_y, player_x, player_size, player_size, false);
    player_x += clipped;
    if (clipped != rounded) {
        var dir = rounded > 0 ? 1 : -1;
        var d = dir > 0 ? DIR_RIGHT : DIR_LEFT;


        var pos1 = div(player_y, tile_size);
        bump(div(player_x, tile_size) + dir, pos1, d, Math.abs(rounded - clipped));

        var pos2 = div(player_y + player_size - 1, tile_size);
        if (pos2 != pos1) {
            bump(div(player_x, tile_size) + dir, pos2, d, Math.abs(rounded - clipped));
        }

        velocity_x = 0;
    }

    for (var i = 0; i < breaking_ladders.length; i++) {
        breaking_ladders[i].ttl--;

        var element = breaking_ladders[i];
        if (element.ttl <= 0) {
            map[element.y][element.x] = 'O';
        }
    }
    breaking_ladders = breaking_ladders.filter(a => a.ttl > 0);

    for (var i = 0; i < crumbling.length; i++) {
        crumbling[i].ttl--;

        var element = crumbling[i];
        if (element.ttl <= 0) {
            map[element.y][element.x] = ' ';
            falling.push({
                'x': element.x * tile_size,
                'y': element.y * tile_size
            });
        }
    }
    crumbling = crumbling.filter(a => a.ttl > 0);

    for (var i = 0; i < falling.length; i++) {
        falling[i].y += faller_speed;

        var element = falling[i];
        if (spawned && intersects(player_x, player_y, player_size, element.x, element.y, tile_size)) {
            kill_player();
        }
    }
    falling = falling.filter(a => a.y < map_height * tile_size);

    over_handler();

    for (var i = 0; i < recordings.length; i++) {
        var frame = recordings[i][Math.min(tick_counter, recordings[i].length - 1)];
        if (frame.red_blue) {
            swap_red_blue();
        }
        for (var j = 0; j < frame.ladders.length; j++) {
            var ladder = frame.ladders[j];
            try_break_ladder(ladder.x, ladder.y);
        }
        for (var j = 0; j < frame.blocks.length; j++) {
            var block = frame.blocks[j];
            try_break_block(block.x, block.y);
        }
        if (spawned && frame.spawn && intersects(player_x, player_y, player_size, frame.x, frame.y, player_size)) {
            kill_player();
        }
        if (is_in_solid(frame.x, frame.y)) {
            kill_bro(i);
        }
        if (frame.ground && !is_on_ground(frame.x, frame.y)) {
            kill_bro(i);
        }
        var bro_on_ladder = is_on('H', frame.x, frame.y) || is_on('F', frame.x, frame.y) || is_on('T', frame.x, frame.y);
        if (!frame.ground && !bro_on_ladder && is_on('O', frame.x, frame.y)) {
            kill_bro(i);
        }
        for (var j = 0; j < falling.length; j++) {
            var faller = falling[j];
            if (intersects(frame.x, frame.y, player_size, faller.x, faller.y, tile_size)) {
                kill_bro(i);
            }
        }
    }

    if (is_on_broken_ladder && !is_on_ok_ladder && !is_on_ground(player_x, player_y)) {
        kill_player();
    }

    if (player_y + player_size > map_height * tile_size) {
        kill_player();
    }

    ++tick_counter;
}


function draw_level()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var textures = {
        '#': images["concrete.jpg"],
        'M': images["spikes.jpg"],
        'W': images["spikes_down.jpg"],
        'E': images["spikes_right.jpg"],
        '3': images["spikes_left.jpg"],
        'H': images["ladder.png"],
        'F': images["cracked_ladder.jpg"],
        'T': images["breaking_ladder.jpg"],
        'O': images["broken_ladder.png"],
        'X': images["cracked.png"],
        'K': images["crumbling.png"],
        'C': images["control_red.png"],
        'c': images["control_blue.png"],
        'R': images["full_red.png"],
        'B': images["full_blue.png"],
        'r': images["empty_red.png"],
        'b': images["empty_blue.png"],
        'S': images["clock.png"],
        's': images["clock_collected.jpg"],
    };
    var unknown_img = images["test.png"];

    var start_x = div(parseInt(camera_x), tile_size);
    var start_y = div(parseInt(camera_y), tile_size);
    var end_x = Math.min(map_width, div(parseInt(camera_x) + cv_width, tile_size) + 1);
    var end_y = Math.min(map_height, div(parseInt(camera_y) + cv_height, tile_size) + 1);
    for (var y = start_y; y < end_y; y++) {
        for (var x = start_x; x < end_x; x++) {
            var ch = map[y][x];
            if (ch in textures) {
                ctx.drawImage(textures[ch], x * tile_size - camera_x, y * tile_size - camera_y, tile_size, tile_size);
            } else if (ch == ' ') {
                continue;
            } else {
                ctx.drawImage(unknown_img, x * tile_size - camera_x, y * tile_size - camera_y, tile_size, tile_size);
            }
        }
    }

    var falling_img = images["falling.png"];
    for (var i = 0; i < falling.length; i++) {
        var element = falling[i];
        ctx.drawImage(falling_img, element.x - camera_x, element.y - camera_y, tile_size, tile_size);
    }

    var recording_render_count = vi_von ? Math.max(recordings.length - 1, 0) : recordings.length;
    for (var i = 0; i < recording_render_count; i++) {
        var record = recordings[i];
        var frame = record[Math.min(record.length - 1, tick_counter)];
        if (frame.spawn) {
            ctx.drawImage(images["clone.jpg"], frame.x - camera_x, frame.y - camera_y, player_size, player_size);
        }
    }

    if (spawned) {
        ctx.drawImage(images["obama.png"], player_x - camera_x, player_y - camera_y, player_size, player_size);
    }

    var digit_width = 24 * 4;
    var digit_height = 32 * 4;
    var digit_x = cv_width - digit_width;
    var number_to_render = div(timer_left, tps);
    if (number_to_render == 0) {
        ctx.drawImage(images["num/0.png"], digit_x, 0, digit_width, digit_height);
    } else {
        while (number_to_render > 0) {
            var rem = number_to_render % 10;
            ctx.drawImage(images["num/" + rem.toString() + ".png"], digit_x, 0, digit_width, digit_height);
            number_to_render = div(number_to_render, 10);
            digit_x -= digit_width;
        }
    }

    digit_width = 12 * 4;
    digit_height = 16 * 4;
    digit_x = 0;
    var string_to_render = collected_clocks.length.toString();
    for (var i = 0; i < string_to_render.length; i++) {
        var digit = string_to_render[i];
        ctx.drawImage(images["num2/" + digit + ".png"], digit_x, 0, digit_width, digit_height);
        digit_x += digit_width;
    }
    ctx.drawImage(images["num2/slash.png"], digit_x, 0, digit_width, digit_height);
    digit_x += digit_width;
    string_to_render = clock_count.toString();
    for (var i = 0; i < string_to_render.length; i++) {
        var digit = string_to_render[i];
        ctx.drawImage(images["num2/" + digit + ".png"], digit_x, 0, digit_width, digit_height);
        digit_x += digit_width;
    }
    ctx.drawImage(textures['S'], digit_x, 0, digit_height, digit_height);
}


const bg_width = 160 * 4;
const bg_height = 96 * 4;
const padding_x = 16 * 4;
const padding_y = 8 * 4;
const text_width = 128 * 4;
const text_height = 32 * 4;

var hovers_on = 1;
var on_title_screen = true;
var game_is_won = false;


function pause_game()
{
    if (game_is_won) {
        return;
    }
    paused = !paused;
    on_title_screen = false;
    if (collected_clocks.length == clock_count) {
        game_is_won = true;
    }
}


function try_select()
{
    if (!paused) {
        return;
    }
    var x = cv_width / 2;
    var y1 = parseInt((cv_height - bg_height) / 2) + padding_y;
    var y2 = parseInt((cv_height - bg_height) / 2) + bg_height - padding_y - text_height;
    click_handler(x, hovers_on == 1 ? y1 : y2, false);
}


function try_move_select()
{
    if (paused && recordings.length > 0) {
        hovers_on = hovers_on == 1 ? 2 : 1;
    }
}


function draw_menu()
{
    if (!paused) {
        return;
    }

    var bg_x = parseInt((cv_width - bg_width) / 2);
    var bg_y = parseInt((cv_height - bg_height) / 2);

    if (on_title_screen) {
        ctx.drawImage(images["title_screen.jpeg"], 0, 0, cv_width, cv_height);
    } else if (game_is_won) {
        ctx.drawImage(images["end_screen.jpg"], 0, 0, cv_width, cv_height);
        return;
    } else {
        ctx.drawImage(images["paused_screen.jpg"], bg_x, bg_y, bg_width, bg_height);
    }

    var text_x = bg_x + padding_x;
    var text_y = bg_y + padding_y;
    if (hovers_on == 1) {
        ctx.drawImage(images["text/select.png"], text_x, text_y, text_width, text_height);
    }
    ctx.drawImage(images["text/continue.png"], text_x, text_y, text_width, text_height);

    if (recordings.length > 0) {
        text_y = bg_y + bg_height - padding_y - text_height;
        if (hovers_on == 2) {
            ctx.drawImage(images["text/select.png"], text_x, text_y, text_width, text_height);
        }
        ctx.drawImage(images["text/degenerate.png"], text_x, text_y, text_width, text_height);
    }
}


function contains_point(x, y, xs, ys, w, h)
{
    return x >= xs && x <= xs + w && y >= ys && y <= ys + h;
}


function click_handler(x, y, hovers)
{
    if (!paused) {
        return;
    }

    var text_x = parseInt((cv_width - bg_width) / 2) + padding_x;
    var text_y = parseInt((cv_height - bg_height) / 2) + padding_y;
    if (contains_point(x, y, text_x, text_y, text_width, text_height)) {
        if (hovers) {
            hovers_on = 1;
            return;
        }
        pause_game();
    }
    text_y = parseInt((cv_height - bg_height) / 2) + bg_height - padding_y - text_height;
    if (contains_point(x, y, text_x, text_y, text_width, text_height)) {
        if (recordings.length > 0) {
            if (hovers) {
                hovers_on = 2;
                return;
            }
            recordings.pop();
            collected_clocks.pop();
            reset_player();
            paused = true;
            if (recordings.length == 0) {
                hovers_on = 1;
            }
        }
    }
}


function maybe_spawn()
{
    if (!paused && !spawned) {
        spawned = true;
    }
}


function loop()
{
    requestAnimationFrame(loop);
    var delta_time = timing();
    elapsed += delta_time;

    if (key_states['p'] && !is_played) {
        // play_sound("rap.ogg");
        play_noise();
        is_played = true;
    } else if (!key_states['p'] && is_played) {
        is_played = false;
    }

    while (elapsed > period) {
        elapsed -= period;
        if (!paused) {
            if (!dying) {
            recording_buffer.push({
                x: player_x,
                y: player_y,
                red_blue: false,
                ground: false,
                spawn: spawned,
                ladders: [],
                blocks: []
            });

            game_tick();

            if (recording_buffer.length != 0) {
                var last = recording_buffer.length - 1;
                recording_buffer[last].x = player_x;
                recording_buffer[last].y = player_y;
                if (spawned) {
                    recording_buffer[last].ground = is_on_ground(player_x, player_y);
                }
            }
            } else {
                if (--dying_left < 0) {
                    dying = false;
                    vi_von = false;
                    dying_left = 0;
                    reset_player();
                }
            }
        }
    }

    debug5.textContent = 'X: ' + velocity_x.toString() + ', Y: ' + velocity_y.toString();
    debug2.textContent = "Pos: " + player_x + ", " + player_y;
    debug4.textContent = "Clocks: " + clock_count.toString();

    var follow_x = bro_index < 0 ? player_x : recordings[bro_index][Math.min(tick_counter, recordings[bro_index].length - 1)].x;
    var follow_y = bro_index < 0 ? player_y : recordings[bro_index][Math.min(tick_counter, recordings[bro_index].length - 1)].y;
    var cam_x = Math.min(map_width * tile_size - cv_width, Math.max(0, follow_x - ((cv_width - player_size) / 2)));
    var cam_y = Math.min(map_height * tile_size - cv_height, Math.max(0, follow_y - ((cv_height - player_size) / 2)));
    camera_x = camera_x + (cam_x - camera_x) * camera_drag;
    camera_y = camera_y + (cam_y - camera_y) * camera_drag;

    draw_level();

    if (paused) {
        draw_menu();
    }
}


function main()
{
    for (var channel = 0; channel < testArrayBuffer.numberOfChannels; channel++) {
        var nowBuffering = testArrayBuffer.getChannelData(channel);
        for (var i = 0; i < testArrayBuffer.length; i++) {
            nowBuffering[i] = (Math.random() * 2 - 1) * 0.25;
        }
    }

    load_level();

    loop();
}


window.onload = load_images;

