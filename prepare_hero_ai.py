#!/usr/bin/env python3
"""Matte and encode verified neural-super-resolution frames for the H-60 hero.

Run upscale_hero_ai.py first. This stage only removes the white background,
packs premultiplied RGB/alpha, and creates normal H.264 browser assets.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SOURCE_SHA256 = '34d5c430febc47ced530ddcd87611ff6de54f2d83ca238af8025cd21f6522287'


def clean_neural_frame(rgb):
    """Extract coverage at the model's 3x output resolution, not at source size."""
    rgb = rgb.astype(np.float32)
    assert rgb.shape == (954, 2160, 3)
    # Track the small white-point shift introduced by the neural network.
    white = np.median(rgb[:60, :150].reshape(-1, 3), axis=0)
    assert np.all(white > 245), 'Expected a clear white source margin'
    evidence = np.clip(1.0 - np.min(rgb / white, axis=2), 0.0, 1.0)
    support = evidence > .045
    distance = ndimage.distance_transform_edt(support)
    interior = (distance >= 6.0) | (evidence >= .94)
    distance_to_interior, nearest = ndimage.distance_transform_edt(~interior, return_indices=True)
    foreground = rgb[nearest[0], nearest[1]]
    direction = white - foreground
    observed = white - rgb
    coverage = np.clip(np.sum(observed * direction, axis=2) /
                       np.maximum(np.sum(direction * direction, axis=2), 1.0), 0, 1)
    far = distance_to_interior > 12.0
    coverage[far] = evidence[far]
    coverage[interior] = 1.0
    # Keep pale, white-contaminated gap pixels from becoming opaque islands.
    coverage = np.minimum(coverage, np.clip(evidence / .70, 0, 1))
    coverage *= np.clip((evidence - .018) / .025, 0, 1)
    premultiplied = np.clip(rgb - (1.0 - coverage[..., None]) * white, 0, 255)
    # Subpixel cleanup at 3x OUTPUT size avoids blurring away neural detail.
    coverage = ndimage.gaussian_filter(coverage, .35, mode='nearest')
    premultiplied = ndimage.gaussian_filter(premultiplied, (.35, .35, 0), mode='nearest')
    coverage[945:] = 0
    premultiplied[945:] = 0
    premultiplied = np.minimum(premultiplied, 255.0 * coverage[..., None])
    return np.uint8(np.round(premultiplied)), np.uint8(np.round(coverage * 255.0))


def save_poster(color, alpha, path):
    color = np.asarray(Image.fromarray(color).resize((1440, 636), Image.Resampling.LANCZOS))
    alpha = np.asarray(Image.fromarray(alpha).resize((1440, 636), Image.Resampling.LANCZOS))
    color = np.minimum(color, alpha[..., None])
    straight = np.uint8(np.clip(color.astype(np.float32) * 255.0 /
                               np.maximum(alpha[..., None], 1), 0, 255))
    Image.fromarray(np.dstack((straight, alpha)), 'RGBA').save(path, optimize=True)


def verify(path, delays, width):
    data = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_packets', '-show_streams', '-of', 'json', str(path)]))
    packets = data['packets']
    actual_delays = [round(float(p['duration_time']) * 1000) for p in packets]
    actual_times = [round(float(p['pts_time']) * 1000) for p in packets]
    assert actual_delays == delays, 'Frame durations changed'
    assert actual_times == np.cumsum([0] + delays[:-1]).tolist(), 'Frame timestamps changed'
    stream = data['streams'][0]
    assert stream['width'] == width and stream['height'] == width * 318 // 720 * 2
    assert abs(float(stream['duration']) * 1000 - sum(delays)) < .01
    assert path.stat().st_size < 25_000_000, 'Asset exceeds browser upload budget'
    return {'file': path.name, 'visible_width': width, 'visible_height': stream['height'] // 2,
            'frames': len(packets), 'duration_ms': sum(delays), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def prepare(args):
    assert hashlib.sha256(args.source.read_bytes()).hexdigest() == SOURCE_SHA256
    gif = Image.open(args.source)
    assert gif.size == (720, 317) and gif.n_frames == 311
    assert 0 <= args.start < args.end <= 311
    manifest = json.loads((args.frames / 'manifest.json').read_text())
    assert manifest['source_sha256'] == SOURCE_SHA256
    assert 'animevideov3' in manifest['model']['name']
    args.output.mkdir(parents=True, exist_ok=True)
    args.work_dir.mkdir(parents=True, exist_ok=True)
    delays = []
    for index in range(args.start, args.end):
        record = manifest['frames'][str(index)]
        path = args.frames / record['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == record['sha256']
        gif.seek(index)
        assert gif.info['duration'] == record['duration_ms']
        delays.append(gif.info['duration'])
        color, alpha = clean_neural_frame(np.asarray(Image.open(path).convert('RGB')))
        packed = np.concatenate((color, np.repeat(alpha[..., None], 3, axis=2)), axis=0)
        Image.fromarray(packed).save(args.work_dir / f'{index:03}.png', compress_level=1)
        if index == 155:
            save_poster(color, alpha, args.output / f'{args.prefix}-poster.png')
        if (index - args.start) % 25 == 0 or index == args.end - 1:
            print(f'Matted {index - args.start + 1}/{args.end - args.start} verified AI frames', flush=True)

    lines = ['ffconcat version 1.0']
    for index, delay in zip(range(args.start, args.end), delays):
        lines += [f"file '{index:03}.png'", 'option framerate 100', f'duration {delay / 1000:.2f}']
    lines += [f"file '{args.end - 1:03}.png'", 'option framerate 100']
    concat = args.work_dir / 'frames.txt'
    concat.write_text('\n'.join(lines) + '\n')
    results = []
    for name, width, level in [('mobile', 1080, '4.0'), ('desktop', 2160, '5.0')]:
        output = args.output / f'{args.prefix}-{name}.mp4'
        height = width * 318 // 720 * 2
        print(f'Encoding {name}', flush=True)
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y',
            '-safe', '0', '-f', 'concat', '-i', str(concat),
            '-t', f'{sum(delays)/1000:.2f}', '-fps_mode', 'vfr', '-enc_time_base', '1:100',
            '-vf', f'scale={width}:{height}:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt709',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
            '-profile:v', 'high', '-level:v', level, '-pix_fmt', 'yuv420p',
            '-x264-params', 'fps=30/1:force-cfr=0', '-bf', '0', '-threads', '4',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
            '-video_track_timescale', '10000',
            '-bsf:v', f'setts=duration=if(eq(N\\,{len(delays)-1})\\,{delays[-1]//10}\\,DURATION)',
            '-an', '-movflags', '+faststart', str(output),
        ], check=True)
        results.append(verify(output, delays, width))
    print(json.dumps({'model': manifest['model']['name'], 'source_sha256': SOURCE_SHA256,
                      'first_source_frame': args.start, 'end_source_frame_exclusive': args.end,
                      'assets': results}, indent=2), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Original 720x317 rotor-wake GIF')
    parser.add_argument('frames', type=Path, help='Directory written by upscale_hero_ai.py')
    parser.add_argument('output', type=Path, help='Output asset directory')
    parser.add_argument('--work-dir', type=Path, required=True, help='Directory for packed intermediate frames')
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--end', type=int, default=311)
    parser.add_argument('--prefix', default='h60-hero-ai')
    args = parser.parse_args()
    for name in ('source', 'frames', 'output', 'work_dir'):
        setattr(args, name, getattr(args, name).resolve())
    prepare(args)


if __name__ == '__main__':
    main()
