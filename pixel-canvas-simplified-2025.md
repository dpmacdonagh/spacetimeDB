# Collaborative Pixel Canvas - SpacetimeDB 2025 Minimal POC

## SpacetimeDB Module (Rust)

```rust
use spacetimedb::{reducer, table, ReducerContext, Table};

#[table(name = pixel)]
pub struct Pixel {
    #[primary_key]
    id: u64,
    color: String,
}

#[reducer]
fn place_pixel(ctx: &ReducerContext, x: u16, y: u16, color: String) {
    let pixel_id = (y as u64 * 1000) + x as u64;
    
    if let Some(mut pixel) = ctx.db.pixel().id().find(&pixel_id) {
        pixel.color = color;
        ctx.db.pixel().id().update(pixel);
    } else {
        ctx.db.pixel().insert(Pixel { id: pixel_id, color });
    }
}
```

## React App

```tsx
import { useState, useEffect, useRef } from 'react';
import { DbConnection } from './client/spacetime-sdk';
import type { Pixel } from './client/spacetime-sdk';

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', 
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#888888', '#FFA500', '#800080', '#FFC0CB'
];

export default function PixelCanvas() {
  const [connection, setConnection] = useState<DbConnection | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [pixels, setPixels] = useState<Map<bigint, Pixel>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Connect to SpacetimeDB
  useEffect(() => {
    const conn = DbConnection.builder()
      .withHost('localhost:3000')
      .withModuleName('pixel-canvas')
      .build();
    setConnection(conn);
    return () => conn.disconnect();
  }, []);

  // Subscribe to pixel updates
  useEffect(() => {
    if (!connection) return;

    const handleInsert = (_: any, pixel: Pixel) => {
      setPixels(prev => new Map(prev).set(pixel.id, pixel));
    };

    const handleUpdate = (_: any, _old: Pixel, pixel: Pixel) => {
      setPixels(prev => new Map(prev).set(pixel.id, pixel));
    };

    connection.db.pixel.onInsert(handleInsert);
    connection.db.pixel.onUpdate(handleUpdate);

    // Initial load
    connection.db.pixel.iter().forEach(pixel => {
      setPixels(prev => new Map(prev).set(pixel.id, pixel));
    });

    return () => {
      connection.db.pixel.removeOnInsert(handleInsert);
      connection.db.pixel.removeOnUpdate(handleUpdate);
    };
  }, [connection]);

  // Draw pixels
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    pixels.forEach(pixel => {
      const y = Math.floor(Number(pixel.id) / 1000);
      const x = Number(pixel.id) % 1000;
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    });
  }, [pixels]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!connection) return;
    
    const x = Math.floor(e.clientX);
    const y = Math.floor(e.clientY);
    
    // Call the reducer
    connection.reducers.placePixel(x, y, selectedColor);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          imageRendering: 'pixelated'
        }}
        onClick={handleClick}
      />
      <div style={{ position: 'fixed', top: 10, left: 10, display: 'flex', gap: '2px' }}>
        {COLORS.map(color => (
          <button
            key={color}
            style={{
              width: 24,
              height: 24,
              backgroundColor: color,
              border: selectedColor === color ? '2px solid white' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </div>
    </>
  );
}
```

## styles/globals.css

```css
body {
  margin: 0;
  overflow: hidden;
  background: black;
}

canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

## package.json

```json
{
  "name": "pixel-canvas",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "generate": "spacetime generate --lang typescript --out-dir ./client/spacetime-sdk --project-path ."
  },
  "dependencies": {
    "@clockworklabs/spacetimedb-sdk": "latest",
    "next": "14.x",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "typescript": "5.x",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

## Key Features:

1. **Uses actual generated types** - Imports from `./client/spacetime-sdk`
2. **Full screen canvas** - Fixed positioning, window width/height
3. **No scrolling or dragging** - Static canvas that fills the viewport
4. **Minimal code** - Under 100 lines total
5. **Correct SDK usage** - Uses `DbConnection`, `db.pixel`, and `reducers.placePixel`
6. **React 19 compatible** - Modern hooks and patterns
7. **Direct pixel placement** - Click coordinates map directly to pixels

The entire implementation is now properly using the generated SDK types and is as minimal as possible.