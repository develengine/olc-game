function div(a, b)
{
    return parseInt(a / b);
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
}


canvas.addEventListener('contextmenu', event => event.preventDefault());

canvas.addEventListener('mousemove', function(e)
{
    var canvas_rect = canvas.getBoundingClientRect();
    var x = e.clientX - canvas_rect.left;
    var y = e.clientY - canvas_rect.top;
    debug2.textContent = "Mouse: " + x + ", " + y;
}, false);

canvas.addEventListener('mousedown', function(e)
{
    var canvas_rect = canvas.getBoundingClientRect();
    var x = e.clientX - canvas_rect.left;
    var y = e.clientY - canvas_rect.top;
    debug3.textContent = "Mouse down: " + x + ", " + y;
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
var to_load_images = [ "obama.png", "patrick.jpg" ];
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
    "           ",
    "          #",
    "          #",
    "  #      # ",
    "  P    #   ",
    "####  #####"
];

var map_width = map[0].length;
var map_height = map.length;
var tile_size = 64;
var player_x = 0;
var player_y = 0;
var player_size = 48;
var player_speed = 0.5;
var velocity_x = 0;
var velocity_y = 0;


function collision_engine(map, vx, vy, x, y, w, h)
{
    var map_w = map[0].length;
    var map_h = map.length;
    var output = { vx: 0, vy: 0 };

    var div_x = div(x, tile_size);
    var both_y = (div_x < map_w - 1) && ((x % tile_size) + w > tile_size);
    var y_pos = vy < 0 ? y : y + h;
    var y_next = y_pos + vy;
    var y_pos_div = div(y_pos, tile_size);
    var y_next_div = div(y_next, tile_size);
    var y_dir = vy < 0 ? -1 : 1;

    for (var i = y_pos_div + y_dir; i != y_next_div + y_dir; i += y_dir) {
        if (map[i][div_x] == '#' || (both_y && map[i][div_x + 1] == '#')) {
            if (y_dir == -1) {
                y_next = (i + 1) * tile_size;
            } else {
                y_next = i * tile_size - 1;
            }
            break;
        }
    }

    output.vy = y_next - y_pos;

    var div_y = div(y, tile_size);
    var both_x = (div_y < map_h - 1) && ((y % tile_size) + h > tile_size);
    var x_pos = vx < 0 ? x : x + w;
    var x_next = x_pos + vx;
    var x_pos_div = div(x_pos, tile_size);
    var x_next_div = div(x_next, tile_size);
    var x_dir = vx < 0 ? -1 : 1;

    for (var i = x_pos_div + x_dir; i != x_next_div + x_dir; i += x_dir) {
        if (map[div_y][i] == '#' || (both_x && map[div_y + 1][i] == '#')) {
            if (x_dir == -1) {
                x_next = (i + 1) * tile_size;
            } else {
                x_next = i * tile_size - 1;
            }
            break;
        }
    }

    output.vx = x_next - x_pos;

    return output;
}


function loop()
{
    requestAnimationFrame(loop);
    var delta_time = timing();
    debug5.textContent = delta_time.toString();

    if (key_states['p'] && !is_played) {
        // play_sound("rap.ogg");
        play_noise();
        is_played = true;
    } else if (!key_states['p'] && is_played) {
        is_played = false;
    }

    var player_vx = 0;
    var player_vy = 0;
    if (key_states['ArrowRight']) {
        player_vx += player_speed * delta_time;
    }
    if (key_states['ArrowLeft']) {
        player_vx -= player_speed * delta_time;
    }
    if (key_states['ArrowUp']) {
        player_vy -= player_speed * delta_time;
    }
    if (key_states['ArrowDown']) {
        player_vy += player_speed * delta_time;
    }
    var clipped = collision_engine(map, player_vx, player_vy, player_x, player_y, player_size, player_size);
    player_x += clipped.vx;
    player_y += clipped.vy;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var tile = images["patrick.jpg"];
    for (var y = 0; y < map_height; y++) {
        for (var x = 0; x < map_width; x++) {
            if (map[y][x] == '#') {
                ctx.drawImage(tile, x * tile_size, y * tile_size, tile_size, tile_size);
            }
        }
    }

    ctx.drawImage(images["obama.png"], player_x, player_y, player_size, player_size);
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
                player_y = y * tile_size + tile_size - player_size - 1;
            }
        }
    }

    loop();
}

window.onload = load_images;

