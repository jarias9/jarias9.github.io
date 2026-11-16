#!/usr/bin/env python3
"""Run the official Real-ESRGAN animevideov3 x3 network on the H-60 GIF.

Install: python -m pip install ncnn==1.0.20261020 numpy pillow
Download the original GIF and the official model archive using the URLs below;
extract the two realesr-animevideov3-x3 model files into a model directory.

Preview:
  python upscale_hero_ai.py original.gif --model-dir models --output-dir ai-frames \
    --start 150 --end 181 --threads 8
Complete the same sequence after reviewing the preview:
  python upscale_hero_ai.py original.gif --model-dir models --output-dir ai-frames \
    --start 0 --end 311 --threads 8 --resume

The end index is exclusive. Resume skips only PNGs whose recorded hashes,
dimensions, source, model, preprocessing, and runtime configuration verify.
Original frame delays are recorded; this program never interpolates motion.
"""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time


SOURCE_URL = 'https://gtri.gatech.edu/public/prod/inline-images/mu0368_gif%20%281%29.gif'
SOURCE_SHA256 = '34d5c430febc47ced530ddcd87611ff6de54f2d83ca238af8025cd21f6522287'
MODEL_NAME = 'realesr-animevideov3-x3'
MODEL_URL = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip'
MODEL_ARCHIVE_SHA256 = 'e5aa6eb131234b87c0c51f82b89390f5e3e642b7b70f2b9bbe95b6a285a40c96'
MODEL_HASHES = {
    MODEL_NAME + '.param': 'd1a5755008791d09b57e3425fc9dd0bd26b00fdf79c606210bc0e693f8230881',
    MODEL_NAME + '.bin': '548a36f9c3f4ab8da56cd3b13badf23968bee207b396dad14d04b830e5f2ab2d',
}
NCNN_VERSION = '1.0.20261020'
BACKGROUND = [254, 252, 254]
OUTPUT_SIZE = [2160, 954]


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def save_manifest(path, manifest):
    manifest['updated_at'] = timestamp()
    temporary = path.with_name(path.name + '.tmp')
    with temporary.open('w', encoding='utf-8') as stream:
        json.dump(manifest, stream, indent=2, sort_keys=True)
        stream.write('\n')
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def save_png(image, path):
    descriptor, name = tempfile.mkstemp(prefix=path.stem + '-', suffix='.png.tmp', dir=path.parent)
    os.close(descriptor)
    temporary = Path(name)
    try:
        image.save(temporary, format='PNG')
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def arguments():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('source', type=Path, help='Original, unmodified 720x317 H-60 GIF')
    parser.add_argument('--model-dir', type=Path, required=True, help='Directory containing the official x3 .param and .bin')
    parser.add_argument('--output-dir', type=Path, required=True, help='Directory for numbered PNGs and manifest.json')
    parser.add_argument('--start', type=int, default=0, help='First source frame, inclusive (default: 0)')
    parser.add_argument('--end', type=int, default=311, help='Last source frame, exclusive (default: 311)')
    parser.add_argument('--threads', type=int, default=8, help='ncnn CPU threads (default: 8)')
    parser.add_argument('--resume', action='store_true', help='Verify an existing manifest and all recorded PNGs before skipping them')
    return parser.parse_args()


def main():
    args = arguments()
    if not 0 <= args.start < args.end <= 311:
        raise ValueError('Require 0 <= --start < --end <= 311.')
    if args.threads < 1:
        raise ValueError('--threads must be positive.')

    try:
        import ncnn
        import numpy as np
        import PIL
        from PIL import Image
    except ImportError as error:
        raise RuntimeError('Install dependencies: python -m pip install ncnn==1.0.20261020 numpy pillow') from error
    if getattr(ncnn, '__version__', None) != NCNN_VERSION:
        raise RuntimeError(f'This reproducible pipeline requires ncnn=={NCNN_VERSION}.')

    source_hash = sha256(args.source)
    if source_hash != SOURCE_SHA256:
        raise ValueError(f'Original GIF SHA256 mismatch: {source_hash}')
    for name, expected in MODEL_HASHES.items():
        actual = sha256(args.model_dir / name)
        if actual != expected:
            raise ValueError(f'Model SHA256 mismatch for {name}: {actual}')

    source_frames = []
    elapsed_ms = 0
    with Image.open(args.source) as source:
        if source.size != (720, 317) or source.n_frames != 311:
            raise ValueError('Expected the original 720x317 GIF with exactly 311 frames.')
        for index in range(source.n_frames):
            source.seek(index)
            delay = int(source.info.get('duration', 0))
            if delay not in (30, 40):
                raise ValueError(f'Unexpected frame delay at {index}: {delay} ms')
            source_frames.append({'index': index, 'duration_ms': delay, 'start_ms': elapsed_ms})
            elapsed_ms += delay
    if elapsed_ms != 10360:
        raise ValueError(f'Expected 10360 ms source duration, found {elapsed_ms}.')

    identity = {
        'schema_version': 1,
        'pipeline': 'h60-real-esrgan-cpu-v1',
        'script_sha256': sha256(Path(__file__)),
        'source_sha256': source_hash,
        'source': {'url': SOURCE_URL, 'size': [720, 317], 'frame_count': 311,
                   'duration_ms': elapsed_ms, 'bytes': args.source.stat().st_size},
        'source_frames': source_frames,
        'model': {'name': MODEL_NAME, 'family': 'Real-ESRGAN', 'source_url': MODEL_URL,
                  'archive_sha256': MODEL_ARCHIVE_SHA256, 'sha256': MODEL_HASHES,
                  'network': 'Official unchanged x3 graph: learned 4x network, included 0.75 resize'},
        'preprocessing': {'padded_size': [720, 318], 'background_rgb': BACKGROUND,
                          'clear_rows_from': 315, 'reflect_padding': 10,
                          'channels': 'RGB', 'normalization': 'float32 / 255'},
        'output_size': OUTPUT_SIZE,
        'runtime': {'engine': 'ncnn', 'version': NCNN_VERSION, 'numpy': np.__version__,
                    'pillow': PIL.__version__, 'device': 'CPU', 'threads': args.threads,
                    'vulkan': False, 'fp16': False},
    }
    manifest_path = args.output_dir / 'manifest.json'
    if args.resume:
        if not manifest_path.is_file():
            raise ValueError('--resume requires an existing manifest.json.')
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        for key, expected in identity.items():
            if manifest.get(key) != expected:
                raise ValueError(f'Resume manifest mismatch for {key}; use the original configuration or a fresh output directory.')
        if not isinstance(manifest.get('frames'), dict):
            raise ValueError('Resume manifest must contain a frames object.')
        for key, entry in manifest['frames'].items():
            index = int(key)
            if str(index) != key or not 0 <= index < 311:
                raise ValueError(f'Invalid manifest frame index: {key}')
            expected_name = f'{index:03d}.png'
            if entry.get('file') != expected_name or entry.get('duration_ms') != source_frames[index]['duration_ms']:
                raise ValueError(f'Invalid manifest metadata for frame {index}.')
            path = args.output_dir / expected_name
            if not path.is_file() or sha256(path) != entry.get('sha256'):
                raise ValueError(f'Unverified or missing PNG for frame {index}; it will not be skipped.')
            with Image.open(path) as image:
                if list(image.size) != OUTPUT_SIZE or image.mode != 'RGB' or image.format != 'PNG':
                    raise ValueError(f'Invalid PNG dimensions or format for frame {index}.')
                image.verify()
        print(f'Verified {len(manifest["frames"])} existing PNGs.', flush=True)
    else:
        if manifest_path.exists() or any(args.output_dir.glob('*.png')):
            raise ValueError('Output already contains a manifest or PNGs; use --resume to verify them, or choose a fresh directory.')
        manifest = dict(identity, created_at=timestamp(), frames={})
    recorded_files = {entry['file'] for entry in manifest['frames'].values()}
    unknown_files = [path.name for path in args.output_dir.glob('*.png') if path.name not in recorded_files]
    if unknown_files:
        raise ValueError(f'Untracked PNGs are not trusted or overwritten: {unknown_files[:5]}')

    args.output_dir.mkdir(parents=True, exist_ok=True)
    save_manifest(manifest_path, manifest)
    requested = [index for index in range(args.start, args.end) if str(index) not in manifest['frames']]
    if not requested:
        print('All requested frames are already verified; no inference needed.', flush=True)
        return

    net = ncnn.Net()
    net.opt.use_vulkan_compute = False
    net.opt.num_threads = args.threads
    net.opt.use_fp16_packed = False
    net.opt.use_fp16_storage = False
    net.opt.use_fp16_arithmetic = False
    if net.load_param(str(args.model_dir / (MODEL_NAME + '.param'))) != 0:
        raise RuntimeError('ncnn could not load the model graph.')
    if net.load_model(str(args.model_dir / (MODEL_NAME + '.bin'))) != 0:
        raise RuntimeError('ncnn could not load the trained weights.')

    started = time.perf_counter()
    with Image.open(args.source) as source:
        for count, index in enumerate(requested, 1):
            frame_started = time.perf_counter()
            source.seek(index)
            rgb = np.empty((318, 720, 3), dtype=np.uint8)
            rgb[:] = BACKGROUND
            rgb[:317] = np.asarray(source.convert('RGB'))
            rgb[315:] = BACKGROUND
            padded = np.ascontiguousarray(np.pad(rgb, ((10, 10), (10, 10), (0, 0)), mode='reflect'))
            input_mat = ncnn.Mat.from_pixels(padded, ncnn.Mat.PixelType.PIXEL_RGB, 740, 338)
            input_mat.substract_mean_normalize([], [1 / 255, 1 / 255, 1 / 255])
            extractor = net.create_extractor()
            if extractor.input('data', input_mat) != 0:
                raise RuntimeError(f'ncnn rejected input for frame {index}.')
            inference_started = time.perf_counter()
            status, output = extractor.extract('output')
            inference_seconds = time.perf_counter() - inference_started
            if status != 0:
                raise RuntimeError(f'ncnn inference failed for frame {index}: {status}')
            prediction = output.numpy()
            if prediction.shape != (3, 1014, 2220):
                raise RuntimeError(f'Unexpected network output shape: {prediction.shape}')
            prediction = prediction[:, 30:984, 30:2190]
            pixels = np.clip(np.rint(prediction.transpose(1, 2, 0) * 255), 0, 255).astype(np.uint8)
            if not np.isfinite(prediction).all():
                raise RuntimeError(f'Nonfinite network output at frame {index}.')
            path = args.output_dir / f'{index:03d}.png'
            save_png(Image.fromarray(pixels), path)
            manifest['frames'][str(index)] = {
                'file': path.name, 'sha256': sha256(path),
                'duration_ms': source_frames[index]['duration_ms'],
                'source_index': index, 'size': OUTPUT_SIZE,
                'script_sha256': identity['script_sha256'],
                'inference_seconds': round(inference_seconds, 6),
            }
            save_manifest(manifest_path, manifest)
            print(f'{count}/{len(requested)} frame {index:03d}: {inference_seconds:.3f}s inference, '
                  f'{time.perf_counter() - frame_started:.3f}s total', flush=True)
            # Release NumPy views and Mats before their extractor/network pools.
            del prediction, output, extractor, input_mat
    print(f'Completed {len(requested)} new frames in {time.perf_counter() - started:.2f}s; '
          f'{len(manifest["frames"])} verified frames recorded in {manifest_path}.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('Interrupted. Completed frames are checkpointed in manifest.json.', file=sys.stderr)
        raise SystemExit(130)
    except (OSError, ValueError, RuntimeError, KeyError, TypeError) as error:
        print(f'Error: {error}', file=sys.stderr)
        raise SystemExit(1)
