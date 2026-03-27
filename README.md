# 3D Product Presentation

A browser-based tool that lets you drag & drop an STL file and instantly renders it
inside a realistic living-room scene, ready for product-photo exports.

## Features

- **Drag & drop STL** – drop any `.stl` file onto the page (binary or ASCII)
- **Living-room scene** – procedural hardwood floor, painted walls, sofa, plant, table
- **Realistic lighting** – ACES Filmic tone-mapping, directional window light, hemisphere sky light, soft shadows
- **Material presets** – Plastic · Metal · Matte · Glossy
- **Color picker** – change the model color on the fly
- **Scale slider** – fine-tune the size of the model on the table
- **Screenshot** – export a full-resolution PNG with one click
- **Orbit controls** – rotate, pan and zoom with mouse / touch

## Local development

No build step required – just serve the root folder with any static server:

```bash
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or `8000`).

## GitHub Pages deployment

Every push to `main` triggers the GitHub Actions workflow
(`.github/workflows/deploy.yml`) which deploys the site automatically to
`https://<user>.github.io/3d-product-presentation/`.
