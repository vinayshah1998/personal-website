// Procedural planet renderer.
//
// One fullscreen fragment pass draws the whole scene: starfield, nebula, an
// analytically intersected planet, its cloud deck, atmosphere, an optional ring
// system and an optional moon. Every planet in the solar system is this same
// shader with different `Params` — which is what lets one planet morph into the
// next during a route change instead of popping.

import { fbmPerlin3d } from "@vgpu/wgsl-std/noise/perlin";
import { hash3 } from "@vgpu/wgsl-std/hash";
import { saturate, remap, safeNormalize3 } from "@vgpu/wgsl-std/math";
import { tonemapAces, linearToSrgb3 } from "@vgpu/wgsl-std/color";

struct Params {
  // Framing
  resolution: vec2f,
  center: vec2f,       // planet offset from screen centre, in min-dimension units

  // Palette
  colorLow: vec4f,     // ocean floor / deepest band
  colorMid: vec4f,     // land / mid band
  colorHigh: vec4f,    // peaks / bright band / storm tint
  colorAtmo: vec4f,    // rgb = atmosphere tint, w = strength
  colorRing: vec4f,    // rgb = ring tint
  colorSun: vec4f,     // rgb = sun tint, w = intensity
  sunDir: vec4f,       // xyz = direction to the sun (normalised)
  noiseScale: vec4f,   // xyz = per-axis surface noise frequency
  spot: vec4f,         // x = longitude, y = latitude, z = size, w = strength

  // Surface
  time: f32,
  spin: f32,           // accumulated rotation of the planet, radians
  tilt: f32,           // axial tilt, radians
  seed: f32,
  waterLevel: f32,
  landLevel: f32,   // noise height where land colour starts
  landSpan: f32,    // noise height range from colorMid up to colorHigh
  gasness: f32,        // 0 = rocky terrain, 1 = banded gas giant
  bandFreq: f32,
  bandWarp: f32,
  bandContrast: f32,   // 1 = Jupiter's hard belts, ~0.4 = Neptune's soft haze
  iceAmount: f32,
  roughness: f32,      // dulls the specular highlight

  // Clouds
  cloudAmount: f32,
  cloudScale: f32,
  cloudDrift: f32,

  // Rings
  ringInner: f32,
  ringOuter: f32,
  ringOpacity: f32,

  // Moon
  moonSize: f32,
  moonDist: f32,
  moonPhase: f32,

  // Scene
  warp: f32,           // 0..1 hyperspace streak during travel
  fade: f32,           // 0..1 overall scene opacity
  starDensity: f32,
  nebula: f32,
  octaves: f32,        // quality tier: surface fBM octave count
  cloudOctaves: f32,
  zoom: f32,           // camera distance multiplier
  vignette: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

const PLANET_RADIUS: f32 = 1.0;

// A long lens. A wide FOV visibly stretches spheres near the frame edge — the
// moon read as an ellipse — so the camera sits far back and looks through a
// narrow cone instead. CAMERA_DISTANCE is matched to FOCAL so the apparent
// size of the planet is unchanged.
const FOCAL: f32 = 0.28;
const CAMERA_DISTANCE: f32 = 5.45;

fn rotY(p: vec3f, a: f32) -> vec3f {
  let c = cos(a);
  let s = sin(a);
  return vec3f(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

fn rotX(p: vec3f, a: f32) -> vec3f {
  let c = cos(a);
  let s = sin(a);
  return vec3f(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

// Near/far intersection of a ray with a sphere of radius `r` at the origin.
// Returns (-1, -1) on a miss.
fn raySphere(ro: vec3f, rd: vec3f, r: f32) -> vec2f {
  let b = dot(ro, rd);
  let c = dot(ro, ro) - r * r;
  let h = b * b - c;
  if (h < 0.0) {
    return vec2f(-1.0, -1.0);
  }
  let s = sqrt(h);
  return vec2f(-b - s, -b + s);
}

// A single cell-hashed star layer. Only the containing cell is sampled: stars
// are sub-pixel points, so the neighbouring-cell contributions a full 3x3x3
// search would add are never visible, and skipping them is 27x cheaper.
fn starLayer(
  dir: vec3f,
  scale: f32,
  falloff: f32,
  density: f32,
  time: f32,
  streakDir: vec3f,
  streak: f32,
) -> vec3f {
  let p = dir * scale;
  let cell = floor(p);
  let f = p - cell;

  let r0 = hash3(cell);
  let r1 = hash3(cell + 19.37);

  // Only a fraction of cells contain a star.
  if (r1.x > density) {
    return vec3f(0.0);
  }

  // Stretching the Gaussian along the screen-radial direction turns each star
  // into a streak while travelling, at no extra samples. `streak` is 1 at rest,
  // which reduces this exactly to the isotropic case.
  let offset = f - r0;
  let along = dot(offset, streakDir);
  let across = offset - streakDir * along;
  let d2 = dot(across, across) + (along * along) / (streak * streak);
  var star = exp(-d2 * falloff);

  // Slow twinkle, individually phased.
  star *= 0.65 + 0.35 * sin(time * (0.6 + r1.y * 1.7) + r1.z * 40.0);

  // Cool/warm scatter across the star population.
  let tint = mix(vec3f(0.62, 0.76, 1.0), vec3f(1.0, 0.86, 0.66), r1.y);
  return tint * star * (0.35 + 0.65 * r1.z);
}

fn starField(dir: vec3f, time: f32, density: f32, streakDir: vec3f, streak: f32) -> vec3f {
  var col = starLayer(dir, 70.0, 300.0, density * 0.5, time, streakDir, streak) * 1.7;
  col += starLayer(dir, 150.0, 520.0, density * 0.85, time, streakDir, streak) * 0.95;
  col += starLayer(dir, 320.0, 900.0, density, time, streakDir, streak) * 0.5;
  return col;
}

// Faint coloured gas, well below the stars in brightness. Two octaves of the
// same field at different scales keeps it from reading as uniform fog.
fn nebulaField(dir: vec3f, seed: f32, amount: f32) -> vec3f {
  if (amount < 0.001) {
    return vec3f(0.0);
  }
  let a = fbmPerlin3d(dir * 1.6 + seed, 4, 2.17, 0.55);
  let b = fbmPerlin3d(dir * 3.4 - seed * 0.7, 3, 2.17, 0.5);

  let m1 = saturate(remap(0.18, 0.88, 0.0, 1.0, a));
  let m2 = saturate(remap(0.28, 0.95, 0.0, 1.0, b));

  let cool = vec3f(0.13, 0.20, 0.52);
  let warm = vec3f(0.34, 0.14, 0.40);
  return (cool * m1 * m1 + warm * m2 * m2 * 0.6) * amount;
}

// Optical density of the ring system at a given orbital radius. Shared by the
// ring pass and by the shadow the rings cast onto the planet.
fn ringDensityAt(radius: f32) -> f32 {
  if (radius <= params.ringInner || radius >= params.ringOuter) {
    return 0.0;
  }
  let u = (radius - params.ringInner) / max(params.ringOuter - params.ringInner, 0.001);
  let n = fbmPerlin3d(vec3f(u * 34.0, 3.7, 1.3), 4, 2.11, 0.55);
  var density = saturate(0.55 + 0.5 * n);
  let fine = fbmPerlin3d(vec3f(u * 130.0, 7.1, 2.9), 3, 2.29, 0.6);
  density *= 0.78 + 0.3 * fine;                              // fine ringlets
  density *= smoothstep(0.015, 0.075, abs(u - 0.63));        // Cassini-style gap
  density *= smoothstep(0.0, 0.07, u) * (1.0 - smoothstep(0.88, 1.0, u));
  return density;
}

struct Surface {
  color: vec3f,
  water: f32,   // 1 where the surface is liquid (drives the specular glint)
}

// Colours a point on the planet from one shared fBM field. Rocky and gaseous
// looks are both derived from `h` and mixed by `gasness`, so the expensive
// noise is evaluated once and a rocky planet can morph into a gas giant.
fn shadeSurface(objectPos: vec3f) -> Surface {
  let octaves = i32(params.octaves);
  let h = fbmPerlin3d(objectPos * params.noiseScale.xyz + params.seed, octaves, 2.17, 0.5);

  // --- Rocky ---------------------------------------------------------------
  let land = smoothstep(params.waterLevel, params.waterLevel + 0.055, h);

  // Shallows read lighter than the abyss.
  let depth = saturate(remap(params.waterLevel - 0.45, params.waterLevel, 0.0, 1.0, h));
  let oceanColor = mix(params.colorLow.rgb * 0.45, params.colorLow.rgb, depth);

  let elevation = saturate(remap(params.landLevel, params.landLevel + params.landSpan, 0.0, 1.0, h));
  let landColor = mix(params.colorMid.rgb, params.colorHigh.rgb, elevation);

  var rocky = mix(oceanColor, landColor, land);

  // Polar caps, with the noise field roughening the ice line.
  let latitude = abs(objectPos.y) + h * 0.07;
  let ice = smoothstep(1.0 - params.iceAmount, 1.0 - params.iceAmount + 0.16, latitude);
  rocky = mix(rocky, vec3f(0.92, 0.95, 1.0), saturate(ice));

  // --- Gaseous -------------------------------------------------------------
  // Latitude bands, turbulently displaced by the same field.
  let band = sin(objectPos.y * params.bandFreq + h * params.bandWarp);
  // Compressing the band sweep toward its midpoint is what separates a hazy
  // ice giant from a hard-belted gas giant.
  let bandT = saturate(0.5 + band * 0.5 * params.bandContrast);
  var gas = mix(params.colorLow.rgb, params.colorMid.rgb, bandT);
  gas = mix(gas, params.colorHigh.rgb, smoothstep(0.5, 1.0, abs(band)) * 0.45 * params.bandContrast);

  // A long-lived storm oval.
  if (params.spot.w > 0.001) {
    let lon = params.spot.x;
    let lat = params.spot.y;
    let sc = vec3f(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
    let d = objectPos - sc;
    // Squashing y widens the oval along the band, like a real storm.
    let dv = vec3f(d.x, d.y * 2.3, d.z);
    let sd = length(dv) / max(params.spot.z, 0.001);
    let mask = (1.0 - smoothstep(0.55, 1.0, sd)) * params.spot.w;
    let swirl = 0.5 + 0.5 * sin(sd * 9.0 - params.time * 0.35 + h * 2.0);
    gas = mix(gas, params.colorHigh.rgb * (0.75 + 0.5 * swirl), saturate(mask));
  }

  var out: Surface;
  out.color = mix(rocky, gas, params.gasness);
  // Only rocky bodies below the water line are wet.
  out.water = (1.0 - land) * (1.0 - params.gasness) * step(-0.5, params.waterLevel);
  return out;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let res = params.resolution;
  let minDim = max(min(res.x, res.y), 1.0);

  // Normalise by the short edge so the planet keeps its apparent size across
  // aspect ratios, then flip y into a maths-oriented frame.
  var p = (uv - vec2f(0.5)) * res / minDim * 2.0;
  p.y = -p.y;
  p -= params.center;

  let camDist = CAMERA_DISTANCE * params.zoom;
  let ro = vec3f(0.0, 0.0, camDist);
  let rd = normalize(vec3f(p * FOCAL, -1.0));

  let sun = normalize(params.sunDir.xyz);
  let sunColor = params.colorSun.rgb * params.colorSun.w;
  let view = -rd;

  // --- Background ----------------------------------------------------------
  var color = vec3f(0.0);

  // Outward direction on screen at this pixel: the axis stars smear along.
  let forward = vec3f(0.0, 0.0, -1.0);
  let streakDir = safeNormalize3(rd - forward * dot(rd, forward), vec3f(1.0, 0.0, 0.0));
  let streak = 1.0 + params.warp * 4.5;

  color = starField(rd, params.time, params.starDensity, streakDir, streak);
  color *= 1.0 + params.warp * 1.5;

  color += nebulaField(rd, params.seed * 0.37, params.nebula);

  // Sun glare, replaced later by anything the ray actually hits.
  let sunAlign = saturate(dot(rd, sun));
  color += sunColor * pow(sunAlign, 900.0) * 3.0;
  color += sunColor * pow(sunAlign, 26.0) * 0.11;

  // --- Planet --------------------------------------------------------------
  let hit = raySphere(ro, rd, PLANET_RADIUS);
  let hitPlanet = hit.x > 0.0;

  // Atmospheric halo just outside the limb, for rays that miss the body.
  if (!hitPlanet && params.colorAtmo.w > 0.001) {
    let tClosest = max(-dot(ro, rd), 0.0);
    let closestPoint = ro + rd * tClosest;
    let halo = smoothstep(PLANET_RADIUS * 1.14, PLANET_RADIUS, length(closestPoint));
    let lit = smoothstep(-0.32, 0.45, dot(normalize(closestPoint), sun));
    color += params.colorAtmo.rgb * pow(halo, 3.5) * params.colorAtmo.w * 0.55 * lit;
  }

  if (hitPlanet) {
    let hitPos = ro + rd * hit.x;
    let normal = normalize(hitPos);

    // World normal -> object space: undo the spin, then the axial tilt.
    let objectPos = rotY(rotX(normal, -params.tilt), -params.spin);

    let surface = shadeSurface(objectPos);
    var albedo = surface.color;
    var cloud = 0.0;

    // Cloud deck, drifting slightly faster than the surface rotates.
    if (params.cloudAmount > 0.001) {
      let cloudPos = rotY(objectPos, params.time * params.cloudDrift);
      let c = fbmPerlin3d(cloudPos * params.cloudScale + 51.7, i32(params.cloudOctaves), 2.31, 0.5);
      cloud = saturate(remap(0.12, 0.55, 0.0, 1.0, c)) * params.cloudAmount;
      albedo = mix(albedo, vec3f(1.0), cloud);
    }

    let ndl = dot(normal, sun);
    // A soft terminator reads as an atmosphere rather than a hard shadow line.
    let diffuse = smoothstep(-0.14, 0.42, ndl);

    // Do the rings block this point's view of the sun?
    var ringShadow = 1.0;
    if (params.ringOpacity > 0.001) {
      let ringNormal = rotX(vec3f(0.0, 1.0, 0.0), params.tilt);
      let dn = dot(sun, ringNormal);
      if (abs(dn) > 0.001) {
        let ts = -dot(hitPos, ringNormal) / dn;
        if (ts > 0.0) {
          let occ = ringDensityAt(length(hitPos + sun * ts));
          ringShadow = 1.0 - saturate(occ * params.ringOpacity) * 0.82;
        }
      }
    }

    var lit = albedo * (sunColor * diffuse * ringShadow + vec3f(0.022, 0.030, 0.055));

    // Specular glint off open water, hidden wherever cloud covers it.
    let wet = surface.water * (1.0 - cloud);
    if (wet > 0.001) {
      let halfVec = normalize(sun + view);
      let shininess = mix(600.0, 90.0, params.roughness);
      let spec = pow(saturate(dot(normal, halfVec)), shininess);
      lit += sunColor * spec * wet * 0.22 * smoothstep(0.05, 0.35, ndl);
    }

    // Limb scattering: brightest where the atmosphere is edge-on and sunlit.
    if (params.colorAtmo.w > 0.001) {
      let fresnel = pow(1.0 - saturate(dot(normal, view)), 3.0);
      lit += params.colorAtmo.rgb * fresnel * params.colorAtmo.w * smoothstep(-0.3, 0.55, ndl);
    }

    color = lit;
  }

  // --- Rings ---------------------------------------------------------------
  if (params.ringOpacity > 0.001) {
    // The ring plane is the planet's equatorial plane.
    let ringNormal = rotX(vec3f(0.0, 1.0, 0.0), params.tilt);
    let denom = dot(rd, ringNormal);
    if (abs(denom) > 0.0005) {
      let tRing = -dot(ro, ringNormal) / denom;
      // Visible only in front of the planet (or where the planet is missed).
      if (tRing > 0.0 && (!hitPlanet || tRing < hit.x)) {
        let rp = ro + rd * tRing;
        let radius = length(rp);
        let density = ringDensityAt(radius);
        if (density > 0.001) {
          // The planet casts a shadow across the far side of the rings.
          let along = dot(rp, sun);
          let perp = length(rp - sun * along);
          var shadow = 1.0;
          if (along < 0.0 && perp < PLANET_RADIUS) {
            shadow = mix(0.18, 1.0, smoothstep(PLANET_RADIUS * 0.72, PLANET_RADIUS, perp));
          }

          // Grazing views look through more material, so they read as denser.
          let thickness = density * params.ringOpacity / max(abs(denom), 0.09);
          let alpha = saturate(1.0 - exp(-thickness * 1.05)) * 0.94;

          let ringLit = params.colorRing.rgb * (0.28 + 0.62 * density) * shadow;
          color = mix(color, ringLit * sunColor, alpha);
        }
      }
    }
  }

  // --- Moon ----------------------------------------------------------------
  if (params.moonSize > 0.001) {
    let angle = params.moonPhase;
    let moonCenter = rotX(
      vec3f(cos(angle) * params.moonDist, 0.0, sin(angle) * params.moonDist),
      params.tilt
    );
    let mHit = raySphere(ro - moonCenter, rd, params.moonSize);
    // Draw only when the moon is nearer than the planet.
    if (mHit.x > 0.0 && (!hitPlanet || mHit.x < hit.x)) {
      let mp = ro + rd * mHit.x - moonCenter;
      let mn = normalize(mp);
      let craters = fbmPerlin3d(mn * 7.0 + 13.0, 3, 2.2, 0.5);
      let mAlbedo = vec3f(0.52, 0.5, 0.48) * (0.78 + 0.3 * craters);
      let mDiff = smoothstep(-0.08, 0.4, dot(mn, sun));
      color = mAlbedo * (sunColor * mDiff + vec3f(0.02, 0.025, 0.04));
    }
  }

  // --- Grade ---------------------------------------------------------------
  color *= params.fade;

  if (params.vignette > 0.001) {
    let d = length(p * vec2f(0.55, 0.62));
    color *= mix(1.0, saturate(1.0 - (d - 0.55) * 0.75), params.vignette);
  }

  return vec4f(linearToSrgb3(tonemapAces(color)), 1.0);
}
