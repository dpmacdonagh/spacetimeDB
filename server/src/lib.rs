use spacetimedb::{reducer, table, Identity, ReducerContext, SpacetimeType, Table, Timestamp};

#[table(name = pixel, public)]
pub struct Pixel {
    x: u32,
    y: u32,
    color: String,
}

#[derive(SpacetimeType)]
pub struct NewPixel {
  sender: Identity,
  x: u32,
  y: u32,
  color: String,
}

#[reducer]
/// Clients invoke this reducer to send pixels.
pub fn send_pixel(ctx: &ReducerContext, new_pixel: NewPixel) -> Result<(), String> {
    ctx.db.pixel().insert(Pixel {
        x: new_pixel.x,
        y: new_pixel.y,
        color: new_pixel.color,
    });
    Ok(())
}