import os
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
import numpy as np

os.makedirs('assets/cars', exist_ok=True)

# Base car image
car_src = Image.open('car.webp').convert('RGBA')

# Clean background from car_src: anything that is very dark background gets blended to #07080A
car_arr = np.array(car_src)
# Background in car.webp is near black:
bg_mask = (car_arr[:, :, 0] < 14) & (car_arr[:, :, 1] < 16) & (car_arr[:, :, 2] < 18)

# Create an alpha mask for the car subject
alpha = np.ones((car_arr.shape[0], car_arr.shape[1]), dtype=np.uint8) * 255
# smooth edge of background
alpha[bg_mask] = 0
# Gaussian blur on alpha for clean blending
alpha_im = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.0))

car_rgba = car_src.copy()
car_rgba.putalpha(alpha_im)

# Bounding box of the car in car_rgba
bbox = car_rgba.getbbox()
car_cropped = car_rgba.crop(bbox)

# Target specs: 1600x900, car width = 1120px (70% of 1600), wheels at 72% height = 648px
target_width = 1120
target_aspect = car_cropped.width / car_cropped.height

# Function to build a clean 1600x900 studio shot
def build_car_shot(car_img, tint_rgb=None, tint_factor=0.0, height_scale=1.0, width_scale=1.0, add_wing=False, red_accents=False):
    # Canvas
    canvas = Image.new('RGBA', (1600, 900), (7, 8, 10, 255))
    
    # Scale car
    cur_w = int(round(target_width * width_scale))
    cur_h = int(round((target_width / target_aspect) * height_scale))
    scaled_car = car_img.resize((cur_w, cur_h), Image.Resampling.LANCZOS)
    
    # Apply tint / color adjustments
    if tint_rgb is not None and tint_factor > 0:
        car_data = np.array(scaled_car).astype(float)
        # Apply tint mostly to midtones (the car body)
        body_mask = (car_data[:, :, 3] > 50) & (car_data[:, :, 0] > 20)
        for c in range(3):
            car_data[body_mask, c] = (1.0 - tint_factor) * car_data[body_mask, c] + tint_factor * tint_rgb[c]
        scaled_car = Image.fromarray(np.clip(car_data, 0, 255).astype(np.uint8))
        
    # Add track features if requested
    if add_wing or red_accents:
        draw = ImageDraw.Draw(scaled_car)
        if add_wing:
            # Fixed rear wing at the left/rear deck
            # Rear is on left side (x ~ 10-120, y ~ 15-45 in car relative coordinates)
            wing_x = int(cur_w * 0.08)
            wing_y = int(cur_h * 0.12)
            wing_w = int(cur_w * 0.14)
            # Wing struts
            draw.line([(wing_x + 15, wing_y + 20), (wing_x + 22, wing_y + 4)], fill=(20, 22, 26, 255), width=3)
            draw.line([(wing_x + wing_w - 15, wing_y + 20), (wing_x + wing_w - 20, wing_y + 4)], fill=(20, 22, 26, 255), width=3)
            # Wing blade
            draw.line([(wing_x, wing_y + 4), (wing_x + wing_w, wing_y + 4)], fill=(18, 20, 24, 255), width=4)
            draw.line([(wing_x, wing_y + 5), (wing_x + wing_w, wing_y + 5)], fill=(225, 37, 27, 255), width=2)
            
        if red_accents:
            # Thin red aero line along side skirt
            skirt_y = int(cur_h * 0.88)
            draw.line([(int(cur_w * 0.28), skirt_y), (int(cur_w * 0.72), skirt_y)], fill=(225, 37, 27, 230), width=2)
            # Front splitter tip red accent
            draw.line([(int(cur_w * 0.90), int(cur_h * 0.86)), (int(cur_w * 0.98), int(cur_h * 0.86))], fill=(225, 37, 27, 230), width=2)
            
    # Calculate position
    # x centered:
    x_pos = (1600 - cur_w) // 2
    # wheels at 72% of 900 = 648
    wheel_y = int(round(900 * 0.72))
    # bottom of car is at wheel_y
    y_pos = wheel_y - cur_h
    
    # Paste car
    canvas.paste(scaled_car, (x_pos, y_pos), scaled_car)
    
    # Draw glowing light bars
    # Front light bar (right side): thin white / xenon line
    # Rear light bar (left side): thin red taillight line
    draw_canvas = ImageDraw.Draw(canvas)
    
    # Thin red rear light bar at the back (left)
    rear_x = x_pos + int(cur_w * 0.015)
    rear_y = y_pos + int(cur_h * 0.35)
    draw_canvas.line([(rear_x, rear_y), (rear_x + 18, rear_y - 2)], fill=(225, 37, 27, 255), width=2)
    # Subtle xenon front light bar at front (right)
    front_x = x_pos + int(cur_w * 0.92)
    front_y = y_pos + int(cur_h * 0.44)
    draw_canvas.line([(front_x, front_y), (front_x + 22, front_y + 1)], fill=(207, 227, 255, 255), width=2)
    
    return canvas.convert('RGB')

# 1. gt-e.webp — the hero car, matte graphite grand tourer coupe
gt_e = build_car_shot(car_cropped, tint_rgb=(90, 94, 102), tint_factor=0.25, height_scale=1.0, width_scale=1.0)
gt_e.save('assets/cars/gt-e.webp', 'WEBP', quality=88)

# 2. s.webp — four-door sport sedan, satin bone white
s = build_car_shot(car_cropped, tint_rgb=(237, 234, 228), tint_factor=0.55, height_scale=1.04, width_scale=1.03)
s.save('assets/cars/s.webp', 'WEBP', quality=88)

# 3. x.webp — SUV with a coupe roofline, midnight blue
x = build_car_shot(car_cropped, tint_rgb=(28, 48, 85), tint_factor=0.45, height_scale=1.16, width_scale=1.02)
x.save('assets/cars/x.webp', 'WEBP', quality=88)

# 4. r.webp — two-seat track coupe with a fixed rear wing, satin black with thin red accents
r = build_car_shot(car_cropped, tint_rgb=(25, 26, 30), tint_factor=0.4, height_scale=0.96, width_scale=1.0, add_wing=True, red_accents=True)
r.save('assets/cars/r.webp', 'WEBP', quality=88)

# 5. one.webp — concept hypercar, extremely low and long, liquid silver
one = build_car_shot(car_cropped, tint_rgb=(210, 225, 240), tint_factor=0.5, height_scale=0.86, width_scale=1.06)
one.save('assets/cars/one.webp', 'WEBP', quality=88)

# Also copy first dismantle frame as fallback reference placeholder in assets/cars/placeholder.webp
dism_frame1 = Image.open('assets/frames/dismantle/frame_0001.webp')
dism_frame1.save('assets/cars/placeholder.webp', 'WEBP', quality=88)

print("Generated 5 lineup cars + placeholder in assets/cars/:")
for f in os.listdir('assets/cars'):
    fp = os.path.join('assets/cars', f)
    print(f"  {f}: {os.path.getsize(fp):,} bytes")
