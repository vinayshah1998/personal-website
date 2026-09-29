"""Generate the tiny-island GLB assets and .blend source.

Run: blender -b --factory-startup --python assets/blender/generate_island.py -- <repo-root>
Blender is Z-up and faces -Y; the glTF exporter converts to Three.js Y-up facing +Z.
"""

import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()
OUT_DIR = os.path.join(ROOT, "public", "island")
BLEND_PATH = os.path.join(ROOT, "assets", "blender", "island.blend")
rng = random.Random(20260929)

PALETTE = {
    "navy": "#2b3a5c",
    "navyDark": "#1f2a44",
    "cream": "#fbf1dc",
    "saffron": "#f2a93b",
    "saffronDeep": "#e0892a",
    "beak": "#f5a524",
    "blush": "#f4a3a0",
    "black": "#1b1b22",
    "white": "#ffffff",
    "grass": "#8fbf5a",
    "grassDeep": "#6fa24a",
    "dirt": "#b8835a",
    "dirtDeep": "#8f6242",
    "stone": "#7f7466",
    "sand": "#ecd6a4",
    "bark": "#7a5236",
    "leafA": "#5f9e4f",
    "leafB": "#79b25a",
    "leafC": "#9bc86a",
    "pine": "#3f7d57",
    "pineLight": "#58986a",
    "rock": "#a9a293",
    "plank": "#c48e5c",
    "plankDark": "#9c6b43",
    "reed": "#7ea45a",
    "cattail": "#7b4f33",
    "petalPink": "#f6a6c1",
    "petalYellow": "#ffd966",
    "petalWhite": "#fff7ea",
    "petalLilac": "#c3a6ec",
    "lily": "#6ab26b",
    "lilyFlower": "#ffc8dc",
    "koi": "#f2894b",
    "bobberRed": "#e8574b",
    "cloud": "#fffaf2",
    "wing": "#ffcf6e",
    "mushroomCap": "#e46f5d",
}

_materials = {}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name, roughness=0.85):
    if name in _materials:
        return _materials[name]
    hex_color = PALETTE[name].lstrip("#")
    rgb = [srgb_to_linear(int(hex_color[i : i + 2], 16) / 255) for i in (0, 2, 4)]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    _materials[name] = mat
    return mat


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _materials.clear()


def collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def empty(name, col, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    obj.parent = parent
    col.objects.link(obj)
    bpy.context.view_layer.update()
    return obj


PRIMITIVES = {
    "sphere": lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1),
    "lowsphere": lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=1),
    "ico": lambda: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1),
    "ico2": lambda: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1),
    "cyl": lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=1, depth=1),
    "cyl6": lambda: bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=1, depth=1),
    "cone": lambda: bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=1, radius2=0, depth=1),
    "cone7": lambda: bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=1, radius2=0, depth=1),
    "cube": lambda: bpy.ops.mesh.primitive_cube_add(size=1),
    "torus": lambda: bpy.ops.mesh.primitive_torus_add(major_segments=20, minor_segments=8, major_radius=1, minor_radius=0.25),
}


def part(name, kind, mat, col, parent=None, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), pivot=None, smooth=False, jitter=0.0):
    """Create a primitive whose origin sits at `pivot` (root space) so Three.js can rotate it naturally."""
    PRIMITIVES[kind]()
    obj = bpy.context.active_object
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)
    obj.name = name
    obj.data.name = name
    pivot_v = Vector(pivot if pivot is not None else loc)
    transform = (
        Matrix.Translation(Vector(loc) - pivot_v)
        @ Matrix.Rotation(rot[2], 4, "Z")
        @ Matrix.Rotation(rot[1], 4, "Y")
        @ Matrix.Rotation(rot[0], 4, "X")
        @ Matrix.Diagonal((*scale, 1))
    )
    obj.data.transform(transform)
    if jitter:
        for v in obj.data.vertices:
            v.co += Vector(tuple(rng.uniform(-jitter, jitter) for _ in range(3)))
    for poly in obj.data.polygons:
        poly.use_smooth = smooth
    obj.data.materials.append(material(mat))
    parent_origin = parent.matrix_world.translation if parent is not None else Vector((0, 0, 0))
    obj.parent = parent
    obj.location = pivot_v - parent_origin
    bpy.context.view_layer.update()
    return obj


def build_penguin(col):
    root = empty("Penguin", col)
    body = part("Body", "sphere", "navy", col, root, loc=(0, 0, 0.42), scale=(0.36, 0.33, 0.42), smooth=True)
    part("Belly", "sphere", "cream", col, body, loc=(0, -0.12, 0.38), scale=(0.28, 0.24, 0.33), smooth=True)
    head = part("Head", "sphere", "navy", col, body, loc=(0, -0.02, 0.86), scale=(0.3, 0.28, 0.27), smooth=True, pivot=(0, 0, 0.7))
    part("Face", "sphere", "cream", col, head, loc=(0, -0.13, 0.84), scale=(0.23, 0.18, 0.18), smooth=True)
    part("Tuft", "cone7", "navyDark", col, head, loc=(0.02, 0.02, 1.15), scale=(0.07, 0.07, 0.14), rot=(0.3, 0.2, 0), smooth=True)
    for side, x in (("L", 1), ("R", -1)):
        part(f"Eye_{side}", "sphere", "black", col, head, loc=(0.1 * x, -0.28, 0.9), scale=(0.045, 0.03, 0.055), smooth=True)
        part(f"EyeShine_{side}", "lowsphere", "white", col, head, loc=(0.1 * x + 0.015, -0.305, 0.92), scale=(0.014, 0.01, 0.016), smooth=True)
        part(f"Cheek_{side}", "sphere", "blush", col, head, loc=(0.17 * x, -0.24, 0.8), scale=(0.05, 0.02, 0.032), smooth=True)
        part(
            f"Flipper_{side}",
            "sphere",
            "navyDark",
            col,
            body,
            loc=(0.35 * x, -0.02, 0.44),
            scale=(0.07, 0.15, 0.24),
            rot=(0, -0.32 * x, 0),
            pivot=(0.3 * x, -0.02, 0.62),
            smooth=True,
        )
        part(
            f"Foot_{side}",
            "sphere",
            "beak",
            col,
            root,
            loc=(0.14 * x, -0.12, 0.035),
            scale=(0.1, 0.15, 0.04),
            pivot=(0.14 * x, -0.02, 0.06),
            smooth=True,
        )
    part("Beak", "cone", "beak", col, head, loc=(0, -0.32, 0.84), scale=(0.07, 0.05, 0.12), rot=(math.pi / 2, 0, 0), smooth=True)
    part("Scarf", "torus", "saffron", col, body, loc=(0, -0.01, 0.7), scale=(0.29, 0.27, 0.36), smooth=True)
    part(
        "ScarfTail",
        "cube",
        "saffronDeep",
        col,
        body,
        loc=(0.12, 0.26, 0.6),
        scale=(0.09, 0.03, 0.2),
        rot=(0.25, 0, 0.2),
        pivot=(0.12, 0.24, 0.7),
        smooth=False,
    )
    rod = part("Rod", "cyl6", "plankDark", col, col.objects["Flipper_R"], loc=(-0.42, -0.35, 0.72), scale=(0.018, 0.018, 0.95), rot=(0.95, 0, 0), pivot=(-0.36, -0.1, 0.5))
    part("RodTip", "lowsphere", "bobberRed", col, rod, loc=(-0.42, -0.72, 1.02), scale=(0.025, 0.025, 0.025), smooth=True)
    return root


def build_island(col):
    root = empty("Island", col)
    bm = bmesh.new()
    segments = 56
    noise = [1 + rng.uniform(-0.035, 0.035) for _ in range(segments)]
    bands = [
        (0.0, 1.0, 0),
        (-0.14, 0.995, 0),
        (-0.24, 0.985, 1),
        (-0.62, 0.955, 1),
        (-0.78, 0.93, 2),
        (-1.35, 0.8, 2),
        (-1.9, 0.52, 2),
        (-2.3, 0.22, 2),
    ]
    rings = []
    for z, scale, _ in bands:
        ring = []
        for i in range(segments):
            angle = i / segments * math.tau
            r = 9.2 * scale * noise[i] * (1 + rng.uniform(-0.012, 0.012) if z < -0.2 else 1)
            ring.append(bm.verts.new((math.cos(angle) * r, math.sin(angle) * r, z + (rng.uniform(-0.04, 0.04) if z < -0.2 else 0))))
        rings.append(ring)
    center = bm.verts.new((0, 0, 0))
    bottom = bm.verts.new((0.3, -0.2, -2.7))
    for i in range(segments):
        j = (i + 1) % segments
        bm.faces.new((center, rings[0][i], rings[0][j])).material_index = 0
        for b in range(len(rings) - 1):
            face = bm.faces.new((rings[b][i], rings[b + 1][i], rings[b + 1][j], rings[b][j]))
            face.material_index = bands[b][2]
        bm.faces.new((rings[-1][j], rings[-1][i], bottom)).material_index = 2
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("IslandTerrain")
    bm.to_mesh(mesh)
    bm.free()
    for name in ("grass", "dirt", "stone"):
        mesh.materials.append(material(name))
    terrain = bpy.data.objects.new("IslandTerrain", mesh)
    terrain.parent = root
    col.objects.link(terrain)

    shore = bmesh.new()
    inner, outer = [], []
    for i in range(48):
        angle = i / 48 * math.tau
        wobble = 1 + 0.03 * math.sin(angle * 3) + rng.uniform(-0.02, 0.02)
        inner.append(shore.verts.new((math.cos(angle) * 0.97, math.sin(angle) * 0.97, 0.012)))
        outer.append(shore.verts.new((math.cos(angle) * 1.16 * wobble, math.sin(angle) * 1.16 * wobble, 0.012)))
    for i in range(48):
        j = (i + 1) % 48
        shore.faces.new((inner[i], outer[i], outer[j], inner[j]))
    bmesh.ops.recalc_face_normals(shore, faces=shore.faces)
    for f in shore.faces:
        if f.normal.z < 0:
            f.normal_flip()
    shore_mesh = bpy.data.meshes.new("PondShore")
    shore.to_mesh(shore_mesh)
    shore.free()
    shore_mesh.materials.append(material("sand"))
    shore_obj = bpy.data.objects.new("PondShore", shore_mesh)
    col.objects.link(shore_obj)
    return root


def build_round_tree(col):
    root = empty("TreeRound", col)
    part("Trunk", "cyl6", "bark", col, root, loc=(0, 0, 0.55), scale=(0.16, 0.16, 1.1), jitter=0.01)
    canopy = empty("Canopy", col, root, location=(0, 0, 1.0))
    for i, (x, y, z, s, m) in enumerate(
        [(0, 0, 1.55, 0.78, "leafA"), (0.38, -0.2, 1.3, 0.55, "leafB"), (-0.35, 0.1, 1.35, 0.58, "leafB"), (0.05, 0.1, 2.0, 0.52, "leafC"), (-0.1, -0.35, 1.7, 0.42, "leafC")]
    ):
        part(f"Leaves{i}", "ico", m, col, canopy, loc=(x, y, z), scale=(s, s, s * 0.92), jitter=0.04)
    return root


def build_pine_tree(col):
    root = empty("TreePine", col)
    part("Trunk", "cyl6", "bark", col, root, loc=(0, 0, 0.35), scale=(0.13, 0.13, 0.7))
    canopy = empty("Canopy", col, root, location=(0, 0, 0.6))
    for i, (z, r, h, m) in enumerate([(0.95, 0.8, 1.0, "pine"), (1.5, 0.62, 0.9, "pineLight"), (2.0, 0.44, 0.8, "pine"), (2.42, 0.26, 0.55, "pineLight")]):
        part(f"Tier{i}", "cone7", m, col, canopy, loc=(0, 0, z), scale=(r, r, h), rot=(0, 0, rng.uniform(0, 1)), jitter=0.02)
    return root


def build_props(col):
    bush = empty("Bush", col)
    for i, (x, y, s, m) in enumerate([(0, 0, 0.42, "leafA"), (0.34, 0.1, 0.32, "leafB"), (-0.3, 0.05, 0.3, "leafC")]):
        part(f"Bush{i}", "ico", m, col, bush, loc=(x, y, s * 0.75), scale=(s, s, s * 0.85), jitter=0.03)

    rock = empty("Rock", col)
    part("RockBody", "ico", "rock", col, rock, loc=(0, 0, 0.18), scale=(0.5, 0.42, 0.34), jitter=0.06)
    part("RockPebble", "ico", "stone", col, rock, loc=(0.42, -0.2, 0.06), scale=(0.16, 0.14, 0.1), jitter=0.02)

    stone = empty("SteppingStone", col)
    part("StoneTop", "cyl", "rock", col, stone, loc=(0, 0, 0.025), scale=(0.3, 0.24, 0.05), jitter=0.015)

    dock = empty("Dock", col)
    length = 2.15
    for i in range(7):
        x = 0.16 + i * (length - 0.2) / 6.6
        part(f"Plank{i}", "cube", "plank" if i % 2 else "plankDark", col, dock, loc=(x, rng.uniform(-0.02, 0.02), 0.13), scale=(0.27, 0.86, 0.05), rot=(0, 0, rng.uniform(-0.04, 0.04)))
    for i, (x, y) in enumerate([(0.3, 0.44), (0.3, -0.44), (length - 0.06, 0.44), (length - 0.06, -0.44), (1.2, 0.44), (1.2, -0.44)]):
        part(f"Post{i}", "cyl6", "plankDark", col, dock, loc=(x, y, 0.05), scale=(0.055, 0.055, 0.5))
    part("Rope", "torus", "sand", col, dock, loc=(length - 0.06, 0.44, 0.24), scale=(0.08, 0.08, 0.12))

    reed = empty("Reeds", col)
    for i in range(6):
        a = i / 6 * math.tau + rng.uniform(-0.3, 0.3)
        r = rng.uniform(0.05, 0.2)
        h = rng.uniform(0.5, 0.85)
        x, y = math.cos(a) * r, math.sin(a) * r
        blade = part(f"Blade{i}", "cone7", "reed", col, reed, loc=(x, y, h / 2), scale=(0.025, 0.025, h), rot=(rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), 0), pivot=(x, y, 0))
        if i % 2 == 0:
            part(f"Cattail{i}", "cyl6", "cattail", col, blade, loc=(x, y, h * 0.85), scale=(0.035, 0.035, 0.14))

    for color in ("petalPink", "petalYellow", "petalWhite", "petalLilac"):
        flower = empty(f"Flower_{color}", col)
        part("Stem", "cyl6", "grassDeep", col, flower, loc=(0, 0, 0.1), scale=(0.012, 0.012, 0.2))
        for p in range(5):
            a = p / 5 * math.tau
            part(f"Petal{p}", "lowsphere", color, col, flower, loc=(math.cos(a) * 0.045, math.sin(a) * 0.045, 0.21), scale=(0.04, 0.04, 0.012), smooth=True)
        part("Center", "lowsphere", "saffron", col, flower, loc=(0, 0, 0.215), scale=(0.025, 0.025, 0.018), smooth=True)

    tuft = empty("GrassTuft", col)
    for i in range(4):
        a = i / 4 * math.tau + 0.4
        part(f"GrassBlade{i}", "cone7", "grassDeep", col, tuft, loc=(math.cos(a) * 0.04, math.sin(a) * 0.04, 0.09), scale=(0.03, 0.03, 0.18), rot=(math.sin(a) * 0.3, math.cos(a) * 0.3, 0), pivot=(0, 0, 0))

    lily = empty("LilyPad", col)
    part("Pad", "cyl", "lily", col, lily, loc=(0, 0, 0.0), scale=(0.24, 0.24, 0.015))
    lily_flower = empty("LilyFlower", col)
    part("LilyPad2", "cyl", "lily", col, lily_flower, loc=(0, 0, 0.0), scale=(0.2, 0.2, 0.015))
    for p in range(6):
        a = p / 6 * math.tau
        part(f"LilyPetal{p}", "lowsphere", "lilyFlower", col, lily_flower, loc=(math.cos(a) * 0.05, math.sin(a) * 0.05, 0.05), scale=(0.05, 0.025, 0.035), rot=(0, -0.5, a), smooth=True)

    mushroom = empty("Mushroom", col)
    part("MushroomStem", "cyl6", "cream", col, mushroom, loc=(0, 0, 0.06), scale=(0.035, 0.035, 0.12), smooth=True)
    part("MushroomCap", "sphere", "mushroomCap", col, mushroom, loc=(0, 0, 0.12), scale=(0.08, 0.08, 0.055), smooth=True)

    fish = empty("Fish", col)
    part("FishBody", "sphere", "koi", col, fish, loc=(0, 0, 0), scale=(0.1, 0.22, 0.09), smooth=True)
    part("FishTail", "cone7", "koi", col, fish, loc=(0, 0.25, 0), scale=(0.06, 0.02, 0.1), rot=(0, math.pi / 2, math.pi / 2), smooth=True)
    part("FishEye", "lowsphere", "black", col, fish, loc=(0.06, -0.14, 0.03), scale=(0.018, 0.018, 0.018), smooth=True)

    bobber = empty("Bobber", col)
    part("BobberTop", "sphere", "bobberRed", col, bobber, loc=(0, 0, 0.05), scale=(0.07, 0.07, 0.07), smooth=True)
    part("BobberBand", "cyl", "white", col, bobber, loc=(0, 0, 0.05), scale=(0.072, 0.072, 0.03), smooth=True)

    cloud = empty("Cloud", col)
    for i, (x, y, z, s) in enumerate([(0, 0, 0, 0.9), (0.9, 0.1, -0.1, 0.7), (-0.85, 0, -0.15, 0.65), (0.3, 0.2, 0.45, 0.6)]):
        part(f"Puff{i}", "ico2", "cloud", col, cloud, loc=(x, y, z), scale=(s, s * 0.8, s * 0.7), smooth=True)

    butterfly = empty("Butterfly", col)
    part("ButterflyBody", "lowsphere", "navyDark", col, butterfly, loc=(0, 0, 0), scale=(0.015, 0.05, 0.015), smooth=True)
    for side, x in (("L", 1), ("R", -1)):
        part(f"Wing_{side}", "lowsphere", "wing", col, butterfly, loc=(0.06 * x, 0, 0), scale=(0.06, 0.05, 0.006), pivot=(0, 0, 0), smooth=True)

    leaf = empty("Leaf", col)
    part("LeafBlade", "lowsphere", "leafC", col, leaf, loc=(0, 0, 0), scale=(0.05, 0.09, 0.008), smooth=True)


def export(path, roots):
    bpy.ops.object.select_all(action="DESELECT")
    for root in roots:
        root.select_set(True)
        for child in root.children_recursive:
            child.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_animations=False,
        export_extras=False,
    )


def main():
    reset_scene()
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
    penguin_col = collection("Penguin")
    world_col = collection("World")
    penguin = build_penguin(penguin_col)
    island = build_island(world_col)
    build_round_tree(world_col)
    build_pine_tree(world_col)
    build_props(world_col)
    export(os.path.join(OUT_DIR, "penguin.glb"), [penguin])
    world_roots = [o for o in world_col.objects if o.parent is None]
    export(os.path.join(OUT_DIR, "world.glb"), world_roots)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH, compress=True)
    print("generated", [o.name for o in world_roots], "penguin parts", len(penguin.children_recursive))


main()
