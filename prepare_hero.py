#!/usr/bin/env python3
"""Prepare the original 311-frame H-60 video for clean alpha compositing.

This is deterministic video processing: no generated detail or new motion.
Color is stored premultiplied in the top half of an ordinary H.264 video;
grayscale coverage is stored in the bottom half. All original delays survive.
"""
import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SOURCE_SHA256 = '34d5c430febc47ced530ddcd87611ff6de54f2d83ca238af8025cd21f6522287'
WHITE = np.array([254.0, 252.0, 254.0], dtype=np.float32)


def source_rgb(image):
    rgb = np.zeros((318, 720, 3), dtype=np.float32)
    rgb[:] = WHITE
    rgb[:317] = np.asarray(image.convert('RGB'), dtype=np.float32)
    # Rows 315+ contain only the original rule and transparent padding.
    rgb[315:] = WHITE
    return rgb


def clean_frame(rgb):
    """White-background trimap with nearest interior color for uncertain edges."""
    evidence = np.clip(1.0 - np.min(rgb / WHITE, axis=2), 0.0, 1.0)
    support = evidence > 0.045
    distance = ndimage.distance_transform_edt(support)
    interior = (distance >= 2.0) | (evidence >= 0.94)
    _, nearest = ndimage.distance_transform_edt(~interior, return_indices=True)
    foreground = rgb[nearest[0], nearest[1]]
    direction = WHITE - foreground
    observed = WHITE - rgb
    coverage = np.sum(observed * direction, axis=2) / np.maximum(np.sum(direction * direction, axis=2), 1.0)
    coverage = np.clip(coverage, 0.0, 1.0)
    far = ndimage.distance_transform_edt(~interior) > 4.0
    coverage[far] = evidence[far]
    coverage[interior] = 1.0
    # Pale pixels inside narrow gaps are not proof of opaque foreground.
    # Bound their coverage before unmatting to remove baked white spill while
    # leaving strongly colored filament cores (evidence >= .70) unchanged.
    coverage = np.minimum(coverage, np.clip(evidence / 0.70, 0.0, 1.0))
    # Remove low-level palette noise from otherwise empty background.
    coverage *= np.clip((evidence - 0.018) / 0.025, 0.0, 1.0)
    coverage[315:] = 0.0
    straight = np.clip((rgb - (1.0 - coverage[..., None]) * WHITE) / np.maximum(coverage[..., None], 1e-5), 0.0, 255.0)
    premul = straight * coverage[..., None]
    # Small source-space antialiasing, applied consistently to color and alpha.
    coverage = ndimage.gaussian_filter(coverage, 0.40, mode='nearest')
    premul = ndimage.gaussian_filter(premul, (0.40, 0.40, 0), mode='nearest')
    coverage[315:] = 0.0
    premul[315:] = 0.0
    return premul, coverage


def upscale(premul, coverage, width):
    height = width * 318 // 720
    size = (width, height)
    color = np.asarray(Image.fromarray(np.uint8(np.clip(premul, 0, 255))).resize(size, Image.Resampling.LANCZOS))
    alpha = np.asarray(Image.fromarray(np.uint8(np.clip(coverage * 255, 0, 255))).resize(size, Image.Resampling.LANCZOS))
    color = np.minimum(color, alpha[..., None])
    return color, alpha


def transparent_image(premul, coverage, width):
    color, alpha = upscale(premul, coverage, width)
    straight = np.uint8(np.clip(color.astype(np.float32) * 255.0 / np.maximum(alpha[..., None], 1), 0, 255))
    return Image.fromarray(np.dstack((straight, alpha)), 'RGBA')


def old_frame(rgb):
    rgba = np.concatenate((rgb, np.full((*rgb.shape[:2], 1), 255.0)), axis=2)
    minimum = rgb.min(axis=2)
    t = np.clip((minimum - 110) / 137, 0, 1)
    alpha = 1 - t * t * (3 - 2 * t)
    rgba[..., :3] = np.clip((rgb - (1-alpha[..., None])*WHITE)/np.maximum(alpha[..., None],1e-5),0,255)
    rgba[..., 3] = alpha*255
    rgba[minimum>=247,3] = 0
    rgba[312:] = 0
    return Image.fromarray(np.uint8(rgba),'RGBA')


def sample(source, output):
    source.seek(155)
    rgb = source_rgb(source)
    premul, alpha = clean_frame(rgb)
    clean = transparent_image(premul, alpha, 1440)
    clean.save(output/'clean-sample.png')
    old = old_frame(rgb).resize((1440,636),Image.Resampling.BILINEAR)
    panel = Image.new('RGB',(1440,636*4))
    for i,(image,bg) in enumerate([(old,'#f3f0e8'),(clean,'#f3f0e8'),(old,'#152126'),(clean,'#152126')]):
        background=Image.new('RGBA',image.size,bg)
        background.alpha_composite(image)
        panel.paste(background.convert('RGB'),(0,i*636))
    panel.save(output/'matte-comparison.jpg',quality=94)
    print(json.dumps({'comparison':str(output/'matte-comparison.jpg'),'poster':str(output/'clean-sample.png')}))


def verify_video(path, delays, width):
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_packets', '-show_streams', '-of', 'json', str(path),
    ]))
    stream = probe['streams'][0]
    packets = probe['packets']
    actual = [round(float(p['duration_time']) * 1000) for p in packets]
    assert actual == delays, f'Frame delays changed in {path}'
    expected_pts = np.cumsum([0] + delays[:-1]).tolist()
    actual_pts = [round(float(p['pts_time']) * 1000) for p in packets]
    assert actual_pts == expected_pts, f'Presentation times changed in {path}'
    assert stream['width'] == width and stream['height'] == width * 318 // 720 * 2
    assert abs(float(stream['duration']) * 1000 - sum(delays)) < .01
    assert path.stat().st_size < 25_000_000, 'Asset exceeds browser upload budget'
    return {'file': path.name, 'visible_width': width,
            'visible_height': stream['height'] // 2,
            'packed_height': stream['height'], 'frames': len(packets),
            'duration_ms': sum(delays), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def encode(source, output, work, reuse_frames=False):
    """Encode one packet per original frame, including the final 30 ms hold."""
    work.mkdir(parents=True, exist_ok=True)
    delays = []
    samples = []
    for i in range(source.n_frames):
        source.seek(i)
        delays.append(source.info['duration'])
        if reuse_frames:
            assert (work / f'{i:03}.png').is_file(), 'Missing prepared frame'
            continue
        premul, coverage = clean_frame(source_rgb(source))
        color, alpha = upscale(premul, coverage, 2160)
        packed = np.concatenate((color, np.repeat(alpha[..., None], 3, axis=2)), axis=0)
        Image.fromarray(packed).save(work / f'{i:03}.png', compress_level=1)
        if i == 155:
            transparent_image(premul, coverage, 1440).save(output / 'h60-hero-clean-poster.png', optimize=True)
        if i in (0, 75, 155, 235, 310):
            rgba = transparent_image(premul, coverage, 1080)
            for background in ('#f3f0e8', '#152126'):
                composite = Image.new('RGBA', rgba.size, background)
                composite.alpha_composite(rgba)
                samples.append(composite.convert('RGB'))
        if i % 50 == 0 or i == source.n_frames - 1:
            print(f'Prepared {i + 1}/{source.n_frames} frames', flush=True)
    assert len(delays) == 311 and sum(delays) == 10360
    if samples:
        contact = Image.new('RGB', (2160, 477 * 5))
        for i, frame in enumerate(samples):
            contact.paste(frame, ((i % 2) * 1080, (i // 2) * 477))
        contact.save(work / 'frame-review.jpg', quality=93)

    # The concat demuxer needs a sentinel to express the preceding duration.
    # -t excludes the sentinel. setts supplies the final real packet duration
    # in the 1/100 encoder timebase, avoiding a spurious/default last delay.
    lines = ['ffconcat version 1.0']
    for i, delay in enumerate(delays):
        lines += [f"file '{i:03}.png'", 'option framerate 100', f'duration {delay / 1000:.2f}']
    lines += ["file '310.png'", 'option framerate 100']
    concat = work / 'frames.txt'
    concat.write_text('\n'.join(lines) + '\n')
    report = []
    for name, width, level in [('mobile', 1080, '4.0'), ('desktop', 2160, '5.0')]:
        path = output / f'h60-hero-clean-{name}.mp4'
        height = width * 318 // 720 * 2
        command = [
            'ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y',
            '-safe', '0', '-f', 'concat', '-i', str(concat),
            '-t', '10.36', '-fps_mode', 'vfr', '-enc_time_base', '1:100',
            '-vf', f'scale={width}:{height}:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt709',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
            '-profile:v', 'high', '-level:v', level, '-pix_fmt', 'yuv420p',
            '-x264-params', 'fps=30/1:force-cfr=0', '-bf', '0', '-threads', '4',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
            '-video_track_timescale', '10000',
            '-bsf:v', 'setts=duration=if(eq(N\\,310)\\,3\\,DURATION)',
            '-an', '-movflags', '+faststart', str(path),
        ]
        print(f'Encoding {name}: {width} x {height} packed', flush=True)
        subprocess.run(command, check=True)
        report.append(verify_video(path, delays, width))
    print(json.dumps({'source_sha256': SOURCE_SHA256, 'assets': report}, indent=2), flush=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('--sample',action='store_true')
    parser.add_argument('--work-dir',type=Path,help='Retain intermediate frames in this directory for inspection')
    parser.add_argument('--reuse-frames',action='store_true',help='Re-encode frames already prepared in --work-dir')
    args=parser.parse_args()
    assert hashlib.sha256(args.source.read_bytes()).hexdigest()==SOURCE_SHA256, 'Source checksum differs'
    args.output.mkdir(parents=True,exist_ok=True)
    source=Image.open(args.source)
    assert source.size==(720,317) and source.n_frames==311
    if args.sample:
        sample(source,args.output)
        return
    if args.work_dir:
        encode(source, args.output.resolve(), args.work_dir.resolve(), args.reuse_frames)
    else:
        with tempfile.TemporaryDirectory(prefix='h60-hero-') as temporary:
            encode(source, args.output.resolve(), Path(temporary))


if __name__=='__main__':
    main()
