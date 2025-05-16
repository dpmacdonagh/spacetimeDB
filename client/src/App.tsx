import { useState, useEffect, useRef } from 'react';
import { DbConnection, ErrorContext, EventContext, Pixel } from './module_bindings/index';
import { Identity } from '@clockworklabs/spacetimedb-sdk';

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00',
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#888888', '#FFA500', '#800080', '#FFC0CB'
];

export default function PixelCanvas() {
  const [connection, setConnection] = useState<DbConnection | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [conn, setConn] = useState<DbConnection | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const lastPixelTimeRef = useRef(0);

  useEffect(() => {
    const subscribeToQueries = (conn: DbConnection, queries: string[]) => {
      let count = 0;
      for (const query of queries) {
        conn
          ?.subscriptionBuilder()
          .onApplied(() => {
            count++;
            if (count === queries.length) {
              console.log('SDK client cache initialized.');
            }
          })
          .subscribe(query);
      }
    };

    const onConnect = (
      conn: DbConnection,
      identity: Identity,
      token: string
    ) => {
      setIdentity(identity);
      setConnected(true);
      setConnection(conn);
      localStorage.setItem('auth_token', token);
      console.log(
        'Connected to SpacetimeDB with identity:',
        identity.toHexString()
      );
      conn.reducers.onSendPixel(() => {
        console.log('Message sent.');
      });
      conn.db.pixel.onInsert((_ctx: EventContext, pixel: Pixel) => {
        setPixels((prev: Map<string, Pixel>) => {
          return new Map(prev).set(`${pixel.x}-${pixel.y}`, pixel);
        })
      })

      subscribeToQueries(conn, ['SELECT * FROM pixel']);
    };

    const onDisconnect = () => {
      console.log('Disconnected from SpacetimeDB');
      setConnected(false);
    };

    const onConnectError = (_ctx: ErrorContext, err: Error) => {
      console.log('Error connecting to SpacetimeDB:', err);
    };

    setConn(
      DbConnection.builder()
        .withUri('ws://localhost:3000')
        .withModuleName('local-pixel-canvas')
        .withToken(localStorage.getItem('auth_token') || '')
        .onConnect(onConnect)
        .onDisconnect(onDisconnect)
        .onConnectError(onConnectError)
        .build()
    );
  }, []);

  // Draw pixels
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    console.log('we got dah pixels', pixels);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    pixels.forEach(pixel => {
      ctx.fillStyle = pixel.color;
      ctx.beginPath();
      ctx.arc(pixel.x + 5, pixel.y + 5, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [pixels]);

  const sendPixel = (x: number, y: number) => {
    if (!connection || !identity) return;
    
    const now = Date.now();
    // if (now - lastPixelTimeRef.current < 16.67) return; // 60fps throttle (1000ms / 60)
    
    lastPixelTimeRef.current = now;
    connection.reducers.sendPixel({x, y, color: selectedColor, sender: identity});
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);
    const x = Math.floor(e.clientX);
    const y = Math.floor(e.clientY);
    sendPixel(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown) return;
    const x = Math.floor(e.clientX);
    const y = Math.floor(e.clientY);
    sendPixel(x, y);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
              borderRadius: '50%',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </div>
    </>
  );
}