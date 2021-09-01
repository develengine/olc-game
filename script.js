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
    if (e.key == 'ArrowUp' && !e.repeat) {
        jump_up();
    }
}


canvas.addEventListener('contextmenu', event => event.preventDefault());


canvas.addEventListener('mousemove', function(e)
{
    var canvas_rect = canvas.getBoundingClientRect();
    var x = e.clientX - canvas_rect.left;
    var y = e.clientY - canvas_rect.top;
    // debug2.textContent = "Mouse: " + x + ", " + y;
}, false);


canvas.addEventListener('mousedown', function(e)
{
    var canvas_rect = canvas.getBoundingClientRect();
    var x = e.clientX - canvas_rect.left;
    var y = e.clientY - canvas_rect.top;
    // debug3.textContent = "Mouse down: " + x + ", " + y;
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
    debug4.textContent = "Wheel: " + e.deltaY;
});


var images = { };
var to_load_images = [ "obama.png", "patrick.jpg", "concrete.jpg", "spikes.jpg" ];
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

var map = [
    "# #                                      ",
    "                                         ",
    "###                                      ",
    "  #                                      ",
    "                                         ",
    "                                         ",
    "                                         ",
    "                                         ",
    "#                                        ",
    "#           ###                          ",
    "#           #                            ",
    " #         #                             ",
    "          ##                             ",
    " P                 W                     ",
    "####  ###################################",
    "####  ###################################"
];


var map_width = map[0].length;
var map_height = map.length;
const tile_size = 64;


function is_solid(ch)
{
    return ch == '#' || ch == 'W';
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

    if (div_a >= map_a) {
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

var elapsed = period / 2;

var camera_x = 0;
var camera_y = 0;
const camera_drag = 0.1;


function is_on_ground()
{
    var x1 = div(player_x, tile_size);
    var x2 = div(player_x + player_size - 1, tile_size);
    var y = div(player_y + player_size + ground_tolerance, tile_size);

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
    if (is_on_ground()) {
        velocity_y = -jump_vel;
        velocity_x *= jump_acc;
    }
}


const DIR_UP    = 0;
const DIR_DOWN  = 1;
const DIR_LEFT  = 2;
const DIR_RIGHT = 3;


function kill_player()
{
    player_x = player_origin_x;
    player_y = player_origin_y;
    velocity_x = 0;
    velocity_y = 0;
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
        case 'W':
            if (dir == DIR_DOWN) {
                kill_player();
            }
            break;
        default:
            break;
    }
}


function loop()
{
    requestAnimationFrame(loop);
    var delta_time = timing();
    elapsed += delta_time;

    while (elapsed > period) {
        elapsed -= period;

        if (key_states['p'] && !is_played) {
            // play_sound("rap.ogg");
            play_noise();
            is_played = true;
        } else if (!key_states['p'] && is_played) {
            is_played = false;
        }

        if (key_states['ArrowRight']) {
            velocity_x += player_acc;
        }
        if (key_states['ArrowLeft']) {
            velocity_x -= player_acc;
        }

        velocity_x *= x_drag;
        velocity_x = cap_off(velocity_x);

        velocity_y += gravity;
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
    }

    debug5.textContent = 'X: ' + velocity_x.toString() + ', Y: ' + velocity_y.toString();
    debug2.textContent = "Pos: " + player_x + ", " + player_y;

    var cam_x = Math.min(map_width * tile_size - cv_width, Math.max(0, player_x - (cv_width / 2)));
    var cam_y = Math.min(map_height * tile_size - cv_height, Math.max(0, player_y - (cv_height / 2)));
    camera_x = camera_x + (cam_x - camera_x) * camera_drag;
    camera_y = camera_y + (cam_y - camera_y) * camera_drag;

    if (player_y - player_size > map_height * tile_size) {
        kill_player();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var tile = images["concrete.jpg"];
    var spikes = images["spikes.jpg"];

    var start_x = div(parseInt(camera_x), tile_size);
    var start_y = div(parseInt(camera_y), tile_size);
    var end_x = Math.min(map_width, div(parseInt(camera_x) + cv_width, tile_size) + 1);
    var end_y = Math.min(map_height, div(parseInt(camera_y) + cv_height, tile_size) + 1);
    for (var y = start_y; y < end_y; y++) {
        for (var x = start_x; x < end_x; x++) {
            switch (map[y][x]) {
                case '#':
                    ctx.drawImage(tile, x * tile_size - camera_x, y * tile_size - camera_y, tile_size, tile_size);
                    break;
                case 'W':
                    ctx.drawImage(spikes, x * tile_size - camera_x, y * tile_size - camera_y, tile_size, tile_size);
                    break;
                default:
                    break;
            }
        }
    }

    ctx.drawImage(images["obama.png"], player_x - camera_x, player_y - camera_y, player_size, player_size);
}


function main()
{
    for (var channel = 0; channel < testArrayBuffer.numberOfChannels; channel++) {
        var nowBuffering = testArrayBuffer.getChannelData(channel);
        for (var i = 0; i < testArrayBuffer.length; i++) {
            nowBuffering[i] = (Math.random() * 2 - 1) * 0.25;
        }
    }

    for (var y = 0; y < map_height; y++) {
        for (var x = 0; x < map_width; x++) {
            if (map[y][x] == 'P') {
                player_x = x * tile_size;
                player_y = y * tile_size + tile_size - player_size;
                player_origin_x = player_x;
                player_origin_y = player_y;
            }
        }
    }

    loop();
}


window.onload = load_images;

