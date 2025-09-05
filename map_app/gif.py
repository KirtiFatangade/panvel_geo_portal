from datetime import datetime, timedelta
import imageio
import requests
from PIL import Image, ImageDraw, ImageFont
import random
import string
import ee
from map_app.main_map.sat import apply_scale_factors
import numpy as np
def add_date_overlay(image, date_text, dim):
    """Add date text overlay to the image."""
    img_pil = Image.fromarray(image)
    draw = ImageDraw.Draw(img_pil)
    try:
        fontsize = 40 # Increase font size here
        font = ImageFont.truetype("arial.ttf", fontsize)
    except IOError:
        font = ImageFont.load_default()
    text_position = (dim[0] - 300, dim[1] - 20)
    draw.text(text_position, date_text, font=font, fill=(255, 255, 0))
    return np.array(img_pil)
def create_gif(urls, dates, output_file, fps, dim):
    images = []
    for url, date in zip(urls, dates):
        response = requests.get(url)
        if response.status_code == 200:
            img = imageio.imread(response.content)
            if img.shape == (dim[1], dim[0], 3):
                img_with_date = add_date_overlay(img, date, dim)
                images.append(img_with_date)
    try:
        imageio.mimsave(output_file, images, format='GIF', fps=int(fps), loop=0)
    except Exception as e:
        print(e)
def get_start_data(start, end, address, boundary):  
    def calculate_percentage(image):
        intersection_area = image.geometry().intersection(boundary).area()
        total_area = boundary.area()
        percentage_covered = (intersection_area.divide(total_area)).multiply(100)
        return image.set("percentage_covered", percentage_covered)
    dataset = ee.ImageCollection(address)
    for date in (start + timedelta(days=n) for n in range(31)):
        if date < end:
            data = (
                dataset.filterDate(date, date + timedelta(1))
                .filterBounds(boundary)
            )
            if data.size().getInfo():
                return date
        else:
            break
    return 0
def get_urls(start_date, end, address, boundary, dim):
    dataset = ee.ImageCollection(address)
    dataset = dataset if address == "COPERNICUS/S2_SR_HARMONIZED" else dataset.map(apply_scale_factors)
    date = start_date
    urls = []
    dates = []
    params = {
        "dimensions": dim,
        "region": boundary,
        "format": "jpeg",
        "min": 0.0,
        "max": 4000 if address == "COPERNICUS/S2_SR_HARMONIZED" else 0.3
    }
    bands = ["B4", "B3", "B2"] if address == "COPERNICUS/S2_SR_HARMONIZED" else ['SR_B4', 'SR_B3', 'SR_B2']
    while date < end:
        data = dataset.filterDate(date, date + timedelta(1)).filterBounds(boundary).select(bands)
        image = data.mean()
        urls.append(image.getThumbURL(params))
        dates.append(date.strftime("%Y-%m-%d"))
        date = date + timedelta(5 if address == "COPERNICUS/S2_SR_HARMONIZED" else 16)
    return urls, dates
def make_gif(start, end, aoi, address, dim, fps):
    start_strip = start.split("-")
    start = datetime(int(start_strip[0]), int(start_strip[1]), int(start_strip[2]))
    end_strip = end.split("-")
    end = datetime(int(end_strip[0]), int(end_strip[1]), int(end_strip[2]))
    start_date = get_start_data(start, end, address, aoi)
    urls, dates = get_urls(start_date, end, address, aoi, dim)
    letters = ''.join(random.choice(string.ascii_lowercase) for _ in range(8))
    name = f"{letters}.gif"
    create_gif(urls, dates, name, fps, dim)
    return name
