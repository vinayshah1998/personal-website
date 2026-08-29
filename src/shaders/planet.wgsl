// Procedural solar-system renderer.
//
// One fullscreen fragment pass draws the whole scene: starfield, nebula, up to
// MAX_BODIES analytically intersected spheres with their cloud decks,
// atmospheres, ring systems and moons, plus orbit lines and the sun.
//
// The site uses this in two configurations, which differ only in uniforms:
//
//   * Section view — one body at the origin, lit by an art-directed directional
//     sun, with the camera parked on the +z axis.
//   * Orrery view  — the sun plus every planet at its orbital position, lit
//     from the sun itself, with a free orbit camera.
//
// Because both are the same shader, moving between them (and between planets)
// is a change of uniforms rather than a change of scene.

import { fbmPerlin3d } from "@vgpu/wgsl-std/noise/perlin";
import { hash3 } from "@vgpu/wgsl-std/hash";
import { saturate, remap, safeNormalize3 } from "@vgpu/wgsl-std/math";
import { tonemapAces, linearToSrgb3 } from "@vgpu/wgsl-std/color";

const MAX_BODIES: i32 = 8;

struct Body {
  colorLow: vec4f,     // ocean floor / deepest band
  colorMid: vec4f,     // land / mid band
  colorHigh: vec4f,    // peaks / bright band / storm tint
  colorAtmo: vec4f,    // rgb = atmosphere tint, w = strength
  colorRing: vec4f,    // rgb = ring tint
  noiseScale: vec4f,   // xyz = per-axis surface noise frequency
  spot: vec4f,         // x = longitude, y = latitude, z = size, w = strength
  position: vec4f,     // xyz = world position, w = radius

  tilt: f32,
  seed: f32,
  waterLevel: f32,
  landLevel: f32,

  landSpan: f32,
  gasness: f32,        // 0 = rocky terrain, 1 = banded gas giant
  bandFreq: f32,
  bandWarp: f32,

  bandContrast: f32,   // 1 = Jupiter's hard belts, ~0.4 = Neptune's soft haze
  iceAmount: f32,
  roughness: f32,
  cloudAmount: f32,

  cloudScale: f32,
  cloudDrift: f32,
  ringInner: f32,      // ring radii are multiples of the body radius
  ringOuter: f32,

  ringOpacity: f32,
  moonSize: f32,
  moonDist: f32,
  moonPhase: f32,

  spin: f32,           // accumulated rotation, radians
  emissive: f32,       // >0 draws the body as a light source (the sun)
  orbitRadius: f32,    // 0 draws no orbit line
  highlight: f32,      // rim highlight, for the hovered body in the orrery
}

struct Params {
  resolution: vec2f,
  center: vec2f,       // screen offset of the camera target, in min-dimension units

  camPos: vec4f,
  camRight: vec4f,
  camUp: vec4f,
  camForward: vec4f,
  colorSun: vec4f,     // rgb = sun tint, w = intensity
  sunPos: vec4f,       // world position of the sun
  sunDir: vec4f,       // art-directed light direction, used in section view

  time: f32,
  focal: f32,
  warp: f32,           // 0..1 hyperspace streak while travelling
  fade: f32,           // 0..1 overall scene opacity

  starDensity: f32,
  nebula: f32,
  octaves: f32,        // quality tier: surface fBM octave count
  cloudOctaves: f32,

  vignette: f32,
  bodyCount: f32,
  orreryMix: f32,      // 0 = directional sun, 1 = lit from sunPos
  orbitLines: f32,

  seed: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,

  bodies: array<Body, 8>,
}

@group(0) @binding(0) var<uniform> params: Params;

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

/** World position of a body's moon. */
fn moonCenterOf(b: Body) -> vec3f {
  let offset = rotX(
    vec3f(cos(b.moonPhase), 0.0, sin(b.moonPhase)) * b.moonDist * b.position.w,
    b.tilt
  );
  return b.position.xyz + offset;
}

/** Direction from a world point toward the sun. */
fn lightDirAt(point: vec3f) -> vec3f {
  let toSun = safeNormalize3(params.sunPos.xyz - point, vec3f(0.0, 0.0, 1.0));
  return normalize(mix(normalize(params.sunDir.xyz), toSun, params.orreryMix));
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

// Optical density of a ring system at a given radius, in body radii. Shared by
// the ring pass and by the shadow the rings cast onto their planet.
fn ringDensityAt(b: Body, radius: f32) -> f32 {
  if (radius <= b.ringInner || radius >= b.ringOuter) {
    return 0.0;
  }
  let u = (radius - b.ringInner) / max(b.ringOuter - b.ringInner, 0.001);
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

// Colours a point on a body from one shared fBM field. Rocky and gaseous looks
// are both derived from `h` and mixed by `gasness`, so the expensive noise is
// evaluated once and a rocky planet can morph into a gas giant.
fn shadeSurface(b: Body, objectPos: vec3f) -> Surface {
  let octaves = i32(params.octaves);
  let h = fbmPerlin3d(objectPos * b.noiseScale.xyz + b.seed, octaves, 2.17, 0.5);

  // --- Rocky ---------------------------------------------------------------
  let land = smoothstep(b.waterLevel, b.waterLevel + 0.055, h);

  // Shallows read lighter than the abyss.
  let depth = saturate(remap(b.waterLevel - 0.45, b.waterLevel, 0.0, 1.0, h));
  let oceanColor = mix(b.colorLow.rgb * 0.45, b.colorLow.rgb, depth);

  let elevation = saturate(remap(b.landLevel, b.landLevel + b.landSpan, 0.0, 1.0, h));
  let landColor = mix(b.colorMid.rgb, b.colorHigh.rgb, elevation);

  var rocky = mix(oceanColor, landColor, land);

  // Polar caps, with the noise field roughening the ice line.
  let latitude = abs(objectPos.y) + h * 0.07;
  let ice = smoothstep(1.0 - b.iceAmount, 1.0 - b.iceAmount + 0.16, latitude);
  rocky = mix(rocky, vec3f(0.92, 0.95, 1.0), saturate(ice));

  // --- Gaseous -------------------------------------------------------------
  let band = sin(objectPos.y * b.bandFreq + h * b.bandWarp);
  // Compressing the band sweep toward its midpoint is what separates a hazy
  // ice giant from a hard-belted gas giant.
  let bandT = saturate(0.5 + band * 0.5 * b.bandContrast);
  var gas = mix(b.colorLow.rgb, b.colorMid.rgb, bandT);
  gas = mix(gas, b.colorHigh.rgb, smoothstep(0.5, 1.0, abs(band)) * 0.45 * b.bandContrast);

  // A long-lived storm oval.
  if (b.spot.w > 0.001) {
    let lon = b.spot.x;
    let lat = b.spot.y;
    let sc = vec3f(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
    let d = objectPos - sc;
    // Squashing y widens the oval along the band, like a real storm.
    let dv = vec3f(d.x, d.y * 2.3, d.z);
    let sd = length(dv) / max(b.spot.z, 0.001);
    let mask = (1.0 - smoothstep(0.55, 1.0, sd)) * b.spot.w;
    let swirl = 0.5 + 0.5 * sin(sd * 9.0 - params.time * 0.35 + h * 2.0);
    gas = mix(gas, b.colorHigh.rgb * (0.75 + 0.5 * swirl), saturate(mask));
  }

  var out: Surface;
  out.color = mix(rocky, gas, b.gasness);
  // Only rocky bodies below the water line are wet.
  out.water = (1.0 - land) * (1.0 - b.gasness) * step(-0.5, b.waterLevel);
  return out;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let res = params.resolution;
  let minDim = max(min(res.x, res.y), 1.0);

  // Normalise by the short edge so bodies keep their apparent size across
  // aspect ratios, then flip y into a maths-oriented frame.
  var p = (uv - vec2f(0.5)) * res / minDim * 2.0;
  p.y = -p.y;
  p -= params.center;

  let ro = params.camPos.xyz;
  let rd = normalize(
    params.camRight.xyz * (p.x * params.focal)
      + params.camUp.xyz * (p.y * params.focal)
      + params.camForward.xyz
  );

  let sunColor = params.colorSun.rgb * params.colorSun.w;
  let view = -rd;

  // --- Background ----------------------------------------------------------
  // Outward direction on screen at this pixel: the axis stars smear along.
  let streakDir = safeNormalize3(
    rd - params.camForward.xyz * dot(rd, params.camForward.xyz),
    params.camRight.xyz
  );
  let streak = 1.0 + params.warp * 4.5;

  var color = starField(rd, params.time, params.starDensity, streakDir, streak);
  color *= 1.0 + params.warp * 1.5;
  color += nebulaField(rd, params.seed * 0.37, params.nebula);

  // Sun glare, replaced later by anything the ray actually hits.
  let sunAlign = saturate(dot(rd, safeNormalize3(params.sunPos.xyz - ro, vec3f(0.0, 0.0, 1.0))));
  color += sunColor * pow(sunAlign, 1400.0) * 3.0;
  color += sunColor * pow(sunAlign, 90.0) * 0.07;

  // --- Nearest body --------------------------------------------------------
  let count = i32(params.bodyCount);
  var bestT = 1.0e30;
  var bestIndex = -1;
  var bestIsMoon = false;

  for (var i = 0; i < MAX_BODIES; i++) {
    if (i >= count) {
      break;
    }
    let b = params.bodies[i];

    let hit = raySphere(ro - b.position.xyz, rd, b.position.w);
    if (hit.x > 0.0 && hit.x < bestT) {
      bestT = hit.x;
      bestIndex = i;
      bestIsMoon = false;
    }

    if (b.moonSize > 0.001) {
      let moonRadius = b.moonSize * b.position.w;
      let mHit = raySphere(ro - moonCenterOf(b), rd, moonRadius);
      if (mHit.x > 0.0 && mHit.x < bestT) {
        bestT = mHit.x;
        bestIndex = i;
        bestIsMoon = true;
      }
    }
  }

  // Atmospheric halo just outside the limb, for rays that miss every body.
  if (bestIndex < 0) {
    for (var i = 0; i < MAX_BODIES; i++) {
      if (i >= count) {
        break;
      }
      let b = params.bodies[i];
      if (b.colorAtmo.w < 0.001) {
        continue;
      }
      let toBody = b.position.xyz - ro;
      let tClosest = max(dot(toBody, rd), 0.0);
      let closest = ro + rd * tClosest - b.position.xyz;
      let halo = smoothstep(b.position.w * 1.14, b.position.w, length(closest));
      if (halo <= 0.0) {
        continue;
      }
      let lit = smoothstep(-0.32, 0.45, dot(normalize(closest), lightDirAt(b.position.xyz)));
      color += b.colorAtmo.rgb * pow(halo, 3.5) * b.colorAtmo.w * 0.55 * lit;
    }
  }

  if (bestIndex >= 0) {
    let b = params.bodies[bestIndex];
    let hitPos = ro + rd * bestT;

    if (bestIsMoon) {
      let mn = normalize(hitPos - moonCenterOf(b));
      let craters = fbmPerlin3d(mn * 7.0 + 13.0, 3, 2.2, 0.5);
      let mAlbedo = vec3f(0.52, 0.5, 0.48) * (0.78 + 0.3 * craters);
      let mDiff = smoothstep(-0.08, 0.4, dot(mn, lightDirAt(hitPos)));
      let moonAmbient = mix(vec3f(0.02, 0.025, 0.04), vec3f(0.10, 0.11, 0.14), params.orreryMix);
      color = mAlbedo * (sunColor * mDiff + moonAmbient);
    } else if (b.emissive > 0.001) {
      // A star: self-lit, with limb darkening and a granular surface.
      let n = normalize(hitPos - b.position.xyz);
      let grain = fbmPerlin3d(n * 6.0 + params.time * 0.05, 3, 2.2, 0.5);
      let limb = pow(saturate(dot(n, view)), 0.35);
      color = b.colorMid.rgb * b.emissive * (0.85 + 0.3 * grain) * (0.55 + 0.75 * limb);
    } else {
      let normal = normalize(hitPos - b.position.xyz);
      let sun = lightDirAt(hitPos);

      // World normal -> object space: undo the spin, then the axial tilt.
      let objectPos = rotY(rotX(normal, -b.tilt), -b.spin);

      let surface = shadeSurface(b, objectPos);
      var albedo = surface.color;
      var cloud = 0.0;

      // Cloud deck, drifting slightly faster than the surface rotates.
      if (b.cloudAmount > 0.001) {
        let cloudPos = rotY(objectPos, params.time * b.cloudDrift);
        let c = fbmPerlin3d(cloudPos * b.cloudScale + 51.7, i32(params.cloudOctaves), 2.31, 0.5);
        cloud = saturate(remap(0.12, 0.55, 0.0, 1.0, c)) * b.cloudAmount;
        albedo = mix(albedo, vec3f(1.0), cloud);
      }

      let ndl = dot(normal, sun);
      // A soft terminator reads as an atmosphere rather than a hard shadow line.
      let diffuse = smoothstep(-0.14, 0.42, ndl);

      // Do the rings block this point's view of the sun?
      var ringShadow = 1.0;
      if (b.ringOpacity > 0.001) {
        let ringNormal = rotX(vec3f(0.0, 1.0, 0.0), b.tilt);
        let dn = dot(sun, ringNormal);
        if (abs(dn) > 0.001) {
          let local = hitPos - b.position.xyz;
          let ts = -dot(local, ringNormal) / dn;
          if (ts > 0.0) {
            let occ = ringDensityAt(b, length(local + sun * ts) / b.position.w);
            ringShadow = 1.0 - saturate(occ * b.ringOpacity) * 0.82;
          }
        }
      }

      let ambient = mix(
        vec3f(0.022, 0.030, 0.055),
        vec3f(0.115, 0.130, 0.165),
        params.orreryMix
      );
      var lit = albedo * (sunColor * diffuse * ringShadow + ambient);

      // Specular glint off open water, hidden wherever cloud covers it.
      let wet = surface.water * (1.0 - cloud);
      if (wet > 0.001) {
        let halfVec = normalize(sun + view);
        let shininess = mix(600.0, 90.0, b.roughness);
        let spec = pow(saturate(dot(normal, halfVec)), shininess);
        lit += sunColor * spec * wet * 0.22 * smoothstep(0.05, 0.35, ndl);
      }

      // Limb scattering: brightest where the atmosphere is edge-on and sunlit.
      let fresnel = pow(1.0 - saturate(dot(normal, view)), 3.0);
      if (b.colorAtmo.w > 0.001) {
        lit += b.colorAtmo.rgb * fresnel * b.colorAtmo.w * smoothstep(-0.3, 0.55, ndl);
      }

      // Hover feedback in the orrery.
      lit += vec3f(0.55, 0.72, 1.0) * fresnel * b.highlight * 0.9;

      color = lit;
    }
  }

  // --- Rings ---------------------------------------------------------------
  for (var i = 0; i < MAX_BODIES; i++) {
    if (i >= count) {
      break;
    }
    let b = params.bodies[i];
    if (b.ringOpacity <= 0.001) {
      continue;
    }

    // The ring plane is the body's equatorial plane.
    let ringNormal = rotX(vec3f(0.0, 1.0, 0.0), b.tilt);
    let denom = dot(rd, ringNormal);
    if (abs(denom) < 0.0005) {
      continue;
    }

    let local = ro - b.position.xyz;
    let tRing = -dot(local, ringNormal) / denom;
    // Visible only in front of whatever the ray already hit.
    if (tRing <= 0.0 || tRing >= bestT) {
      continue;
    }

    let rp = local + rd * tRing;
    let radius = length(rp) / b.position.w;
    let density = ringDensityAt(b, radius);
    if (density <= 0.001) {
      continue;
    }

    // The planet casts a shadow across the far side of the rings.
    let sun = lightDirAt(rp + b.position.xyz);
    let along = dot(rp, sun);
    let perp = length(rp - sun * along);
    var shadow = 1.0;
    if (along < 0.0 && perp < b.position.w) {
      shadow = mix(0.18, 1.0, smoothstep(b.position.w * 0.72, b.position.w, perp));
    }

    // Grazing views look through more material, so they read as denser.
    let thickness = density * b.ringOpacity / max(abs(denom), 0.09);
    let alpha = saturate(1.0 - exp(-thickness * 1.05)) * 0.94;

    let ringLit = b.colorRing.rgb * (0.28 + 0.62 * density) * shadow;
    color = mix(color, ringLit * sunColor, alpha);
    bestT = tRing;
  }

  // --- Orbit lines ---------------------------------------------------------
  if (params.orbitLines > 0.001 && abs(rd.y) > 0.0001) {
    let tPlane = (params.sunPos.y - ro.y) / rd.y;
    if (tPlane > 0.0 && tPlane < bestT) {
      let hp = ro + rd * tPlane - params.sunPos.xyz;
      let r = length(hp.xz);
      // Width in world units that holds roughly constant on screen.
      let width = max(tPlane * params.focal * 0.010, 0.004);
      var line = 0.0;
      for (var i = 0; i < MAX_BODIES; i++) {
        if (i >= count) {
          break;
        }
        let orbit = params.bodies[i].orbitRadius;
        if (orbit <= 0.0) {
          continue;
        }
        line += 1.0 - smoothstep(0.0, width, abs(r - orbit));
      }
      // Fade the far side out so the lines suggest a plane rather than a grid.
      let fadeFar = 1.0 - smoothstep(0.55, 1.0, r / 18.0);
      color += vec3f(0.30, 0.45, 0.75) * saturate(line) * params.orbitLines * 0.5 * fadeFar;
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
