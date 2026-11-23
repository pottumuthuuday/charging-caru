import os
import re
import time
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
import numpy as np

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def are_frames_nearly_identical(path1, path2, threshold=2.0):
    im1 = np.array(Image.open(path1).convert('RGB')).astype(float)
    im2 = np.array(Image.open(path2).convert('RGB')).astype(float)
    mae = np.mean(np.abs(im1 - im2))
    return mae < threshold, mae

def process_frame(args):
    src_path, dest_1600, dest_960 = args
    im = Image.open(src_path).convert('RGB')
    orig_w, orig_h = im.size
    
    # 1600px wide
    h_1600 = int(round(orig_h * 1600.0 / orig_w))
    im_1600 = im.resize((1600, h_1600), Image.Resampling.LANCZOS)
    im_1600.save(dest_1600, 'WEBP', quality=78, method=4)
    
    # 960px wide
    h_960 = int(round(orig_h * 960.0 / orig_w))
    im_960 = im.resize((960, h_960), Image.Resampling.LANCZOS)
    im_960.save(dest_960, 'WEBP', quality=72, method=4)
    return True

def get_folder_size(path):
    total = 0
    for root, dirs, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            total += os.path.getsize(fp)
    return total

def main():
    start_time = time.time()
    
    # 1. Identify input directories
    clip1_dir = 'clip1-frame'
    clip2_dir = 'clip2-frame'
    clip3_dir = 'clip3-frame'
    dismantle_dir = 'flowclip-frame'
    
    # 2. Sort files in natural numeric order
    c1_files = [os.path.join(clip1_dir, f) for f in sorted(os.listdir(clip1_dir), key=natural_sort_key) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    c2_files = [os.path.join(clip2_dir, f) for f in sorted(os.listdir(clip2_dir), key=natural_sort_key) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    c3_files = [os.path.join(clip3_dir, f) for f in sorted(os.listdir(clip3_dir), key=natural_sort_key) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    dismantle_files = [os.path.join(dismantle_dir, f) for f in sorted(os.listdir(dismantle_dir), key=natural_sort_key) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    
    print(f"Loaded: clip1={len(c1_files)}, clip2={len(c2_files)}, clip3={len(c3_files)}, dismantle={len(dismantle_files)}")
    
    # Check join boundaries
    hero_files = list(c1_files)
    
    # clip2 join check
    c2_start_idx = 0
    if hero_files and c2_files:
        is_ident, mae = are_frames_nearly_identical(hero_files[-1], c2_files[0])
        print(f"MAE between clip1 last frame and clip2 first frame: {mae:.2f}")
        if is_ident:
            print("clip2 first frame is identical/near-identical to clip1 last frame -> skipping it")
            c2_start_idx = 1
        else:
            print("clip2 first frame is distinct -> keeping it")
    hero_files.extend(c2_files[c2_start_idx:])
    
    # clip3 join check
    c3_start_idx = 0
    if hero_files and c3_files:
        is_ident, mae = are_frames_nearly_identical(hero_files[-1], c3_files[0])
        print(f"MAE between clip2 last frame and clip3 first frame: {mae:.2f}")
        if is_ident:
            print("clip3 first frame is identical/near-identical to clip2 last frame -> skipping it")
            c3_start_idx = 1
        else:
            print("clip3 first frame is distinct -> keeping it")
    hero_files.extend(c3_files[c3_start_idx:])
    
    print(f"Total hero frames to generate: {len(hero_files)}")
    print(f"Total dismantle frames to generate: {len(dismantle_files)}")
    
    # Create output directories
    hero_out_dir = os.path.join('assets', 'frames', 'hero')
    hero_mob_out_dir = os.path.join('assets', 'frames', 'hero-mobile')
    dismantle_out_dir = os.path.join('assets', 'frames', 'dismantle')
    dismantle_mob_out_dir = os.path.join('assets', 'frames', 'dismantle-mobile')
    
    for d in [hero_out_dir, hero_mob_out_dir, dismantle_out_dir, dismantle_mob_out_dir]:
        os.makedirs(d, exist_ok=True)
        
    tasks = []
    # Hero tasks
    for i, src in enumerate(hero_files, start=1):
        dest_1600 = os.path.join(hero_out_dir, f"frame_{i:04d}.webp")
        dest_960 = os.path.join(hero_mob_out_dir, f"frame_{i:04d}.webp")
        tasks.append((src, dest_1600, dest_960))
        
    # Dismantle tasks
    for i, src in enumerate(dismantle_files, start=1):
        dest_1600 = os.path.join(dismantle_out_dir, f"frame_{i:04d}.webp")
        dest_960 = os.path.join(dismantle_mob_out_dir, f"frame_{i:04d}.webp")
        tasks.append((src, dest_1600, dest_960))
        
    print(f"Starting parallel conversion of {len(tasks)} frames ({len(tasks)*2} output WebP images)...")
    
    # Run in parallel using ProcessPoolExecutor
    workers = min(os.cpu_count() or 4, 8)
    with ProcessPoolExecutor(max_workers=workers) as executor:
        for idx, _ in enumerate(executor.map(process_frame, tasks), start=1):
            if idx % 100 == 0 or idx == len(tasks):
                print(f"  Processed {idx}/{len(tasks)} frames...")
                
    elapsed = time.time() - start_time
    print(f"Completed in {elapsed:.2f} seconds.")
    
    # Folder statistics
    folders = [
        ("assets/frames/hero", hero_out_dir),
        ("assets/frames/hero-mobile", hero_mob_out_dir),
        ("assets/frames/dismantle", dismantle_out_dir),
        ("assets/frames/dismantle-mobile", dismantle_mob_out_dir),
    ]
    
    print("\n--- OUTPUT STATISTICS ---")
    for name, path in folders:
        files = [f for f in os.listdir(path) if f.endswith('.webp')]
        size_bytes = get_folder_size(path)
        size_mb = size_bytes / (1024 * 1024)
        print(f"{name}: {len(files)} frames, {size_mb:.2f} MB ({size_bytes:,} bytes)")

if __name__ == '__main__':
    main()
